import AppKit

/// System sounds via NSSound; respects `soundEnabled` in UserDefaults.
final class SoundManager {
    static let shared = SoundManager()

    private let soundEnabledKey = "soundEnabled"

    var soundEnabled: Bool {
        get {
            if UserDefaults.standard.object(forKey: soundEnabledKey) == nil { return true }
            return UserDefaults.standard.bool(forKey: soundEnabledKey)
        }
        set { UserDefaults.standard.set(newValue, forKey: soundEnabledKey) }
    }

    enum AppSound {
        case scanComplete
        case cleanDone
        case error
        case itemDeleted
        case warning
    }

    func play(_ sound: AppSound) {
        guard soundEnabled else { return }
        switch sound {
        case .scanComplete:
            NSSound(named: "Glass")?.play()
        case .cleanDone:
            NSSound(named: "Hero")?.play()
        case .error:
            NSSound(named: "Basso")?.play()
        case .itemDeleted:
            NSSound(named: "Tink")?.play()
        case .warning:
            NSSound(named: "Funk")?.play()
        }
    }
}
