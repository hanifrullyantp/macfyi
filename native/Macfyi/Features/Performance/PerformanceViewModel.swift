import AppKit
import Combine
import Foundation

final class PerformanceViewModel: ObservableObject {
    @Published var loginItems: [LoginItemRow] = []
    @Published var launchAgents: [LaunchAgentEntry] = []
    @Published var ram: RAMSnapshot?
    @Published var topProcesses: [ProcessMemoryRow] = []
    @Published var analysisPhase: String = ""
    @Published var isAnalyzing = false
    @Published var analysisProgress: Double = 0
    @Published var errorMessage: String?

    /// AI-style hints (local strings, not a real model).
    var loginHint: String {
        let n = loginItems.count
        if n == 0 { return String(localized: "perf.ai.login.none") }
        return String(format: String(localized: "perf.ai.login.some"), n)
    }

    var ramHint: String {
        guard let r = ram else { return "" }
        return String(format: String(localized: "perf.ai.ram"), r.usedPercent)
    }

    private var timer: Timer?

    func onAppear() {
        refreshStaticLists()
        refreshRAMAndTop()
        timer = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in
            self?.refreshRAMAndTop()
        }
        RunLoop.main.add(timer!, forMode: .common)
    }

    func onDisappear() {
        timer?.invalidate()
        timer = nil
    }

    func refreshStaticLists() {
        loginItems = LoginItemsService.copySessionLoginItems()
        launchAgents = LaunchAgentService.loadAgents()
    }

    func refreshRAMAndTop() {
        ram = RAMStatsService.currentSnapshot()
        topProcesses = TopProcessService.topByMemory(limit: 8)
    }

    /// Simulated multi-phase “performance analysis” for orb action.
    @MainActor
    func runPerformanceAnalysis() async {
        isAnalyzing = true
        analysisProgress = 0
        errorMessage = nil
        let phases = [
            String(localized: "perf.phase.login"),
            String(localized: "perf.phase.background"),
            String(localized: "perf.phase.ram"),
            String(localized: "perf.phase.cpu"),
            String(localized: "perf.phase.summary"),
        ]
        for (i, p) in phases.enumerated() {
            analysisPhase = p
            analysisProgress = Double(i) / Double(phases.count)
            try? await Task.sleep(nanoseconds: 450_000_000)
            refreshStaticLists()
            refreshRAMAndTop()
        }
        analysisProgress = 1
        analysisPhase = String(localized: "perf.phase.done")
        isAnalyzing = false
        SoundManager.shared.play(.scanComplete)
    }

    func openLoginItemsSystemSettings() {
        if let url = URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension") {
            NSWorkspace.shared.open(url)
        }
    }

    func freeRAMInfoAlert() -> (title: String, message: String) {
        (
            String(localized: "perf.ram.purge.title"),
            String(localized: "perf.ram.purge.message")
        )
    }
}
