import Foundation
import UserNotifications

enum AppNotifications {
    static func requestAuthorizationIfNeeded() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            guard settings.authorizationStatus == .notDetermined else { return }
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
        }
    }

    static func postScanComplete(itemCount: Int, sizeSummary: String) {
        let content = UNMutableNotificationContent()
        content.title = String(localized: "notif.scanComplete.title")
        content.body = String(format: String(localized: "notif.scanComplete.body"), itemCount, sizeSummary)
        content.sound = .default
        let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req)
    }

    static func postCleanComplete(freedSize: String) {
        let content = UNMutableNotificationContent()
        content.title = String(localized: "notif.cleanComplete.title")
        content.body = String(format: String(localized: "notif.cleanComplete.body"), freedSize)
        content.sound = .default
        let req = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: nil)
        UNUserNotificationCenter.current().add(req)
    }
}
