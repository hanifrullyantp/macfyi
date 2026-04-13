import Foundation

enum MaintenanceTaskKind: String, CaseIterable, Identifiable {
    case periodicScripts
    case diskFirstAid
    case flushDNS
    case spotlightRebuild

    var id: String { rawValue }
}

struct MaintenanceTaskState: Identifiable {
    let kind: MaintenanceTaskKind
    var lastRun: Date?
    var lastStatus: String?
    var isRunning: Bool
}

enum MaintenanceTasksService {
    /// Flush DNS — usually succeeds without admin.
    static func flushDNS() async throws -> String {
        try await runAndCapture("/usr/sbin/dscacheutil", arguments: ["-flushcache"])
        try await runShell("killall -HUP mDNSResponder 2>/dev/null || true")
        return String(localized: "perf.maintenance.dns.done")
    }

    /// Verify boot volume (read-only check where possible).
    static func verifySystemVolume() async throws -> String {
        let out = try await runAndCapture("/usr/sbin/diskutil", arguments: ["verifyVolume", "/"])
        return out
    }

    /// Rebuild Spotlight — may require Full Disk Access / admin for system volume.
    static func rebuildSpotlight() async throws -> String {
        try await runAndCapture("/usr/bin/mdutil", arguments: ["-E", "/"])
    }

    /// `periodic` daily/weekly/monthly scripts — typically need root; we surface stderr.
    static func runPeriodicDaily() async throws -> String {
        try await runShell("sudo -n periodic daily 2>&1 || periodic daily 2>&1")
    }

    private static func runAndCapture(_ path: String, arguments: [String]) async throws -> String {
        try await withCheckedThrowingContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                let p = Process()
                p.executableURL = URL(fileURLWithPath: path)
                p.arguments = arguments
                let pipe = Pipe()
                p.standardOutput = pipe
                p.standardError = pipe
                do {
                    try p.run()
                    p.waitUntilExit()
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    let s = String(data: data, encoding: .utf8) ?? ""
                    if p.terminationStatus == 0 {
                        cont.resume(returning: s.isEmpty ? String(localized: "perf.maintenance.ok") : s)
                    } else {
                        cont.resume(throwing: NSError(domain: "Macfyi", code: Int(p.terminationStatus), userInfo: [NSLocalizedDescriptionKey: s]))
                    }
                } catch {
                    cont.resume(throwing: error)
                }
            }
        }
    }

    private static func runShell(_ script: String) async throws -> String {
        try await withCheckedThrowingContinuation { cont in
            DispatchQueue.global(qos: .userInitiated).async {
                let p = Process()
                p.executableURL = URL(fileURLWithPath: "/bin/zsh")
                p.arguments = ["-lc", script]
                let pipe = Pipe()
                p.standardOutput = pipe
                p.standardError = pipe
                do {
                    try p.run()
                    p.waitUntilExit()
                    let data = pipe.fileHandleForReading.readDataToEndOfFile()
                    let s = String(data: data, encoding: .utf8) ?? ""
                    cont.resume(returning: s.isEmpty ? String(localized: "perf.maintenance.ok") : s)
                } catch {
                    cont.resume(throwing: error)
                }
            }
        }
    }
}
