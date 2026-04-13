import AppKit
import Darwin

struct RAMSnapshot: Sendable {
    let totalBytes: UInt64
    let activeBytes: UInt64
    let wiredBytes: UInt64
    let compressedBytes: UInt64
    let freeBytes: UInt64
    /// Apparent used (total - free) for bar display
    let usedBytes: UInt64
    let usedPercent: Double
}

enum RAMStatsService {
    static func currentSnapshot() -> RAMSnapshot? {
        var memSize: UInt64 = 0
        var len = MemoryLayout<UInt64>.size
        guard sysctlbyname("hw.memsize", &memSize, &len, nil, 0) == 0 else { return nil }

        var count = mach_msg_type_number_t(MemoryLayout<vm_statistics64_data_t>.size / MemoryLayout<integer_t>.size)
        var stats = vm_statistics64_data_t()
        let kr = withUnsafeMutablePointer(to: &stats) {
            $0.withMemoryRebound(to: integer_t.self, capacity: Int(count)) {
                host_statistics64(mach_host_self(), HOST_VM_INFO64, $0, &count)
            }
        }
        guard kr == KERN_SUCCESS else { return nil }

        let pageSize = UInt64(vm_kernel_page_size)
        let free = UInt64(stats.free_count) * pageSize
        let active = UInt64(stats.active_count) * pageSize
        let wired = UInt64(stats.wire_count) * pageSize
        let compressed = UInt64(stats.compressor_page_count) * pageSize
        let used = memSize > free ? memSize - free : 0
        let pct = memSize > 0 ? Double(used) / Double(memSize) * 100 : 0

        return RAMSnapshot(
            totalBytes: memSize,
            activeBytes: active,
            wiredBytes: wired,
            compressedBytes: compressed,
            freeBytes: free,
            usedBytes: used,
            usedPercent: min(100, max(0, pct))
        )
    }
}

struct ProcessMemoryRow: Identifiable, Sendable {
    let id: Int32
    let name: String
    let rssBytes: UInt64
    let isRunning: Bool
}

enum TopProcessService {
    /// Top N processes by RSS via `ps` (reliable across macOS versions).
    static func topByMemory(limit: Int = 8) -> [ProcessMemoryRow] {
        let task = Process()
        task.executableURL = URL(fileURLWithPath: "/bin/ps")
        task.arguments = ["-axo", "pid=,rss=,comm="]
        let pipe = Pipe()
        task.standardOutput = pipe
        task.standardError = FileHandle.nullDevice
        do {
            try task.run()
            task.waitUntilExit()
        } catch {
            return []
        }
        let data = pipe.fileHandleForReading.readDataToEndOfFile()
        guard let s = String(data: data, encoding: .utf8) else { return [] }
        var rows: [(pid: Int32, rss: UInt64, name: String)] = []
        for line in s.split(separator: "\n", omittingEmptySubsequences: true) {
            let parts = line.split(whereSeparator: { $0 == " " || $0 == "\t" }, maxSplits: 2, omittingEmptySubsequences: true)
            guard parts.count >= 3,
                  let pid = Int32(parts[0]),
                  let rssKb = UInt64(parts[1])
            else { continue }
            let name = String(parts[2])
            let rss = rssKb * 1024
            rows.append((pid, rss, name))
        }
        rows.sort { $0.rss > $1.rss }
        let running = Set(NSWorkspace.shared.runningApplications.compactMap { $0.processIdentifier })
        return rows.prefix(limit).map {
            ProcessMemoryRow(
                id: $0.pid,
                name: $0.name,
                rssBytes: $0.rss,
                isRunning: running.contains(Int($0.pid))
            )
        }
    }
}
