import AppKit
import Foundation

/// Persists security-scoped bookmarks for user-granted folders (Documents, Downloads, Desktop).
enum FolderBookmarkStore {
    private static let keyPrefix = "macfyi.bookmark."

    enum Kind: String, CaseIterable {
        case documents
        case downloads
        case desktop

        var panelTitle: String {
            switch self {
            case .documents: String(localized: "onboard.permission.documents")
            case .downloads: String(localized: "onboard.permission.downloads")
            case .desktop: String(localized: "onboard.permission.desktop")
            }
        }

        func systemURL() -> URL {
            switch self {
            case .documents:
                FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
                    ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Documents")
            case .downloads:
                FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask).first
                    ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Downloads")
            case .desktop:
                FileManager.default.urls(for: .desktopDirectory, in: .userDomainMask).first
                    ?? URL(fileURLWithPath: NSHomeDirectory()).appendingPathComponent("Desktop")
            }
        }
    }

    static func saveBookmark(for url: URL, kind: Kind) throws {
        let data = try url.bookmarkData(
            options: .withSecurityScope,
            includingResourceValuesForKeys: nil,
            relativeTo: nil
        )
        UserDefaults.standard.set(data, forKey: keyPrefix + kind.rawValue)
    }

    static func resolveURL(kind: Kind) -> URL? {
        guard let data = UserDefaults.standard.data(forKey: keyPrefix + kind.rawValue) else { return nil }
        var stale = false
        return try? URL(
            resolvingBookmarkData: data,
            options: .withSecurityScope,
            relativeTo: nil,
            bookmarkDataIsStale: &stale
        )
    }

    static func startAccessing(kind: Kind) -> Bool {
        guard let url = resolveURL(kind: kind) else { return false }
        return url.startAccessingSecurityScopedResource()
    }

    static func stopAccessing(kind: Kind) {
        resolveURL(kind: kind)?.stopAccessingSecurityScopedResource()
    }
}
