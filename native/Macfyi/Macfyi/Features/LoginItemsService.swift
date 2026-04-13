import AppKit
import CoreServices

struct LoginItemRow: Identifiable, Hashable, Sendable {
    let id: String
    let name: String
    let url: URL
}

/// Session login items via `LSSharedFileList` (legacy API; may return empty on some configurations).
enum LoginItemsService {
    static func copySessionLoginItems() -> [LoginItemRow] {
        guard let list = LSSharedFileListCreate(nil, kLSSharedFileListSessionLoginItems.takeUnretainedValue(), nil)?.takeRetainedValue()
        else { return [] }

        guard let snapshot = LSSharedFileListCopySnapshot(list, nil)?.takeRetainedValue()
        else { return [] }

        let cfArray = snapshot as CFArray
        let count = CFArrayGetCount(cfArray)
        var result: [LoginItemRow] = []
        result.reserveCapacity(count)

        for i in 0 ..< count {
            let raw = CFArrayGetValueAtIndex(cfArray, i)
            let item = unsafeBitCast(raw, to: LSSharedFileListItem.self)
            var err: Unmanaged<CFError>?
            guard let urlRef = LSSharedFileListItemCopyResolvedURL(item, 0, &err)?.takeRetainedValue() else { continue }
            let url = urlRef as URL
            let name = url.lastPathComponent
            result.append(LoginItemRow(id: url.path, name: name, url: url))
        }
        return result
    }
}
