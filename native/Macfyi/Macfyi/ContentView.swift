import SwiftUI

extension Notification.Name {
    static let macfyiFirstScan = Notification.Name("MacfyiFirstScan")
}

enum SidebarRoute: String, CaseIterable, Identifiable {
    case smartCare
    case cleanup
    case clutter
    case uninstaller
    case userTrash
    case performance
    case monitor
    case history
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .smartCare: String(localized: "shell.smartCare")
        case .cleanup: String(localized: "shell.cleanup")
        case .clutter: String(localized: "shell.clutter")
        case .uninstaller: String(localized: "shell.uninstaller")
        case .userTrash: String(localized: "shell.userTrash")
        case .performance: String(localized: "shell.performance")
        case .monitor: String(localized: "shell.monitor")
        case .history: String(localized: "shell.history")
        case .settings: String(localized: "shell.settings")
        }
    }

    var systemImage: String {
        switch self {
        case .smartCare: "sparkles"
        case .cleanup: "trash"
        case .clutter: "circle.dashed"
        case .uninstaller: "shippingbox"
        case .userTrash: "trash.circle"
        case .performance: "bolt.fill"
        case .monitor: "waveform.path.ecg"
        case .history: "clock"
        case .settings: "gearshape"
        }
    }
}

struct ContentView: View {
    @State private var route: SidebarRoute? = .smartCare
    @State private var orb: OrbVisualState = .idle
    @State private var scanTask: Task<Void, Never>?
    @State private var performanceModel = PerformanceViewModel()

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            NavigationSplitView {
                VStack(alignment: .leading, spacing: 0) {
                    HStack(spacing: 10) {
                        Circle()
                            .fill(MacFYITheme.brandPrimary)
                            .frame(width: 10, height: 10)
                        Text(MacfyiAppName.value)
                            .font(.title2.weight(.bold))
                            .foregroundStyle(MacFYITheme.textPrimary)
                        Spacer(minLength: 0)
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 8)
                    List(selection: $route) {
                        Section(String(localized: "shell.section.maintenance")) {
                            ForEach([SidebarRoute.smartCare, .cleanup, .clutter, .uninstaller, .userTrash, .performance]) { r in
                                sidebarRow(r)
                            }
                        }
                        Section(String(localized: "shell.section.insights")) {
                            ForEach([SidebarRoute.monitor, .history]) { r in
                                sidebarRow(r)
                            }
                        }
                        Section(String(localized: "shell.section.system")) {
                            sidebarRow(.settings)
                        }
                    }
                    .listStyle(.sidebar)
                    .scrollContentBackground(.hidden)
                    .background(MacFYITheme.sidebarBackground)
                }
                .background(MacFYITheme.sidebarBackground)
                .navigationSplitViewColumnWidth(min: 220, ideal: 240)
            } detail: {
                detailView
                    .navigationTitle((route ?? .smartCare).title)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(MacFYITheme.backgroundPrimary)
            }
            .tint(MacFYITheme.brandPrimary)

            OrbButtonView(
                state: orb,
                performanceModule: route == .performance,
                onTap: handleOrbTap
            )
            .padding(28)
            .zIndex(999)
        }
        .background(MacFYITheme.backgroundPrimary)
        .onReceive(NotificationCenter.default.publisher(for: .macfyiFirstScan)) { _ in
            startScanFlow()
        }
    }

    @ViewBuilder
    private var detailView: some View {
        switch route ?? .smartCare {
        case .smartCare:
            ModulePlaceholderView(titleKey: "module.smartCare.title", subtitleKey: "module.smartCare.subtitle")
        case .cleanup:
            ModulePlaceholderView(titleKey: "module.cleanup.title", subtitleKey: "module.cleanup.subtitle")
        case .clutter:
            ModulePlaceholderView(titleKey: "module.clutter.title", subtitleKey: "module.clutter.subtitle")
        case .uninstaller:
            ModulePlaceholderView(titleKey: "module.uninstall.title", subtitleKey: "module.uninstall.subtitle")
        case .userTrash:
            ModulePlaceholderView(titleKey: "module.trash.title", subtitleKey: "module.trash.subtitle")
        case .performance:
            PerformanceView(model: performanceModel)
        case .monitor:
            ModulePlaceholderView(titleKey: "module.monitor.title", subtitleKey: "module.monitor.subtitle")
        case .history:
            ModulePlaceholderView(titleKey: "module.history.title", subtitleKey: "module.history.subtitle")
        case .settings:
            SettingsPlaceholderView()
        }
    }

    private func sidebarRow(_ r: SidebarRoute) -> some View {
        HStack(spacing: 0) {
            if route == r {
                Rectangle()
                    .fill(MacFYITheme.sidebarActiveIndicator)
                    .frame(width: 3)
            }
            Label {
                Text(r.title)
            } icon: {
                Image(systemName: r.systemImage)
            }
            .padding(.leading, route == r ? 8 : 11)
        }
        .listRowBackground(
            route == r ? MacFYITheme.sidebarActiveBackground : Color.clear
        )
        .tag(r)
    }

    private func handleOrbTap() {
        switch route ?? .smartCare {
        case .performance:
            Task { await performanceModel.runPerformanceAnalysis() }
        default:
            switch orb {
            case .idle:
                startScanFlow()
            case .results:
                startScanFlow()
            case .scanning, .cleaning:
                break
            }
        }
    }

    private func startScanFlow() {
        scanTask?.cancel()
        orb = .scanning(progress: 0)
        scanTask = Task {
            for i in 0 ... 40 {
                if Task.isCancelled { return }
                try? await Task.sleep(nanoseconds: 60_000_000)
                let p = Double(i) / 40
                await MainActor.run {
                    orb = .scanning(progress: p)
                }
            }
            await MainActor.run {
                orb = .results
                SoundManager.shared.play(.scanComplete)
                AppNotifications.postScanComplete(itemCount: 128, sizeSummary: "12,4 GB")
            }
        }
    }
}

private struct SettingsPlaceholderView: View {
    @AppStorage("soundEnabled") private var soundEnabled = true

    var body: some View {
        Form {
            Toggle(String(localized: "settings.sound"), isOn: $soundEnabled)
                .onChange(of: soundEnabled) { _, v in
                    SoundManager.shared.soundEnabled = v
                }
            Text(String(localized: "settings.sound.hint"))
                .font(.caption)
                .foregroundStyle(MacFYITheme.textSecondary)
        }
        .formStyle(.grouped)
        .scrollContentBackground(.hidden)
        .background(MacFYITheme.backgroundPrimary)
        .padding()
        .onAppear {
            SoundManager.shared.soundEnabled = soundEnabled
        }
    }
}
