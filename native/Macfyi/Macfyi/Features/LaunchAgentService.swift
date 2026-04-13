import Foundation

struct LaunchAgentEntry: Identifiable, Hashable, Sendable {
    let id: String
    let label: String
    let plistURL: URL
    let programPath: String?
    let runAtLoad: Bool
}

enum LaunchAgentService {
    static func loadAgents(homeURL: URL = FileManager.default.homeDirectoryForCurrentUser) -> [LaunchAgentEntry] {
        let paths = [
            homeURL.appendingPathComponent("Library/LaunchAgents", isDirectory: true),
            URL(fileURLWithPath: "/Library/LaunchAgents", isDirectory: true),
        ]
        var out: [LaunchAgentEntry] = []
        let fm = FileManager.default
        for dir in paths {
            guard let contents = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) else { continue }
            for url in contents where url.pathExtension == "plist" {
                if let e = parsePlist(at: url) {
                    out.append(e)
                }
            }
        }
        return out.sorted { $0.label.localizedCaseInsensitiveCompare($1.label) == .orderedAscending }
    }

    private static func parsePlist(at url: URL) -> LaunchAgentEntry? {
        guard let dict = NSDictionary(contentsOf: url) as? [String: Any] else { return nil }
        let label = dict["Label"] as? String ?? url.deletingPathExtension().lastPathComponent
        let runAtLoad = dict["RunAtLoad"] as? Bool ?? false
        var program: String?
        if let s = dict["Program"] as? String {
            program = s
        } else if let args = dict["ProgramArguments"] as? [String], let first = args.first {
            program = first
        }
        return LaunchAgentEntry(
            id: url.path,
            label: label,
            plistURL: url,
            programPath: program,
            runAtLoad: runAtLoad
        )
    }

    static func isProcessRunning(pid: Int32?) -> Bool {
        guard let pid else { return false }
        return NSWorkspace.shared.runningApplications.contains { $0.processIdentifier == pid }
    }
}
