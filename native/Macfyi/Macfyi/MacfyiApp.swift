import AppKit
import SwiftUI

@main
struct MacfyiApp: App {
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var showOnboarding = false

    init() {
        AppNotifications.requestAuthorizationIfNeeded()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .background(MacFYITheme.backgroundPrimary)
                .onAppear {
                    showOnboarding = !hasCompletedOnboarding
                }
                .sheet(isPresented: $showOnboarding) {
                    OnboardingView(isPresented: $showOnboarding) {
                        NotificationCenter.default.post(name: .macfyiFirstScan, object: nil)
                    }
                }
        }
        .windowToolbarStyle(.unified)
        .commands {
            CommandGroup(replacing: .appInfo) {
                Button(String(localized: "about.macfyi")) {
                    NSApp.orderFrontStandardAboutPanel(nil)
                }
            }
        }
    }
}
