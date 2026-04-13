import SwiftUI

struct PerformanceView: View {
    @ObservedObject var model: PerformanceViewModel
    @State private var expanded: Set<String> = ["login", "agents", "ram", "maint"]
    @State private var showPurgeInfo = false
    @State private var maintStates: [MaintenanceTaskKind: MaintenanceUIState] = [:]

    struct MaintenanceUIState {
        var lastRun: Date?
        var lastMessage: String?
        var running = false
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                header
                card(String(localized: "perf.section.login"), id: "login") {
                    Text(String(localized: "perf.section.login.subtitle"))
                        .font(.subheadline)
                        .foregroundStyle(MacFYITheme.textSecondary)
                    Text(model.loginHint)
                        .font(.caption)
                        .foregroundStyle(MacFYITheme.textTertiary)
                        .padding(.vertical, 4)
                    ForEach(model.loginItems) { item in
                        HStack {
                            Image(systemName: "app.fill")
                                .foregroundStyle(MacFYITheme.textSecondary)
                            VStack(alignment: .leading) {
                                Text(item.name)
                                    .foregroundStyle(MacFYITheme.textPrimary)
                                Text(item.url.path)
                                    .font(.caption2)
                                    .foregroundStyle(MacFYITheme.textTertiary)
                                    .lineLimit(1)
                            }
                            Spacer()
                        }
                        .padding(8)
                        .background(MacFYITheme.backgroundElevated.opacity(0.5))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    if model.loginItems.isEmpty {
                        Text(String(localized: "perf.empty.login"))
                            .foregroundStyle(MacFYITheme.textTertiary)
                    }
                    Button(String(localized: "perf.openSystemLoginItems")) {
                        model.openLoginItemsSystemSettings()
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(MacFYITheme.brandPrimary)
                }
                card(String(localized: "perf.section.agents"), id: "agents") {
                    Text(String(localized: "perf.section.agents.subtitle"))
                        .font(.subheadline)
                        .foregroundStyle(MacFYITheme.textSecondary)
                    ForEach(model.launchAgents) { agent in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Text(agent.label)
                                    .foregroundStyle(MacFYITheme.textPrimary)
                                Spacer()
                                Text(agent.runAtLoad ? String(localized: "perf.agent.runAtLoad") : String(localized: "perf.agent.onDemand"))
                                    .font(.caption2)
                                    .foregroundStyle(MacFYITheme.textTertiary)
                            }
                            if let p = agent.programPath {
                                Text(p)
                                    .font(.caption2)
                                    .foregroundStyle(MacFYITheme.textTertiary)
                                    .lineLimit(2)
                            }
                        }
                        .padding(8)
                        .background(MacFYITheme.backgroundElevated.opacity(0.5))
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    if model.launchAgents.isEmpty {
                        Text(String(localized: "perf.empty.agents"))
                            .foregroundStyle(MacFYITheme.textTertiary)
                    }
                }
                card(String(localized: "perf.section.ram"), id: "ram") {
                    if let r = model.ram {
                        Text(String(format: String(localized: "perf.ram.total"), formatBytes(r.totalBytes)))
                            .foregroundStyle(MacFYITheme.textPrimary)
                        ProgressView(value: r.usedPercent / 100)
                            .tint(MacFYITheme.brandPrimary)
                        Text(String(format: String(localized: "perf.ram.usedPct"), r.usedPercent, formatBytes(r.usedBytes)))
                            .font(.subheadline)
                            .foregroundStyle(MacFYITheme.textSecondary)
                        gridRow(String(localized: "perf.ram.active"), r.activeBytes)
                        gridRow(String(localized: "perf.ram.wired"), r.wiredBytes)
                        gridRow(String(localized: "perf.ram.compressed"), r.compressedBytes)
                        gridRow(String(localized: "perf.ram.free"), r.freeBytes)
                        Text(model.ramHint)
                            .font(.caption)
                            .foregroundStyle(MacFYITheme.textTertiary)
                            .padding(.top, 4)
                    }
                    Text(String(localized: "perf.topRam.title"))
                        .font(.headline)
                        .padding(.top, 8)
                    ForEach(Array(model.topProcesses.enumerated()), id: \.element.id) { idx, p in
                        HStack {
                            Text("\(idx + 1).")
                                .foregroundStyle(MacFYITheme.textTertiary)
                            Text(p.name)
                                .foregroundStyle(MacFYITheme.textPrimary)
                            Spacer()
                            Text(formatBytes(p.rssBytes))
                                .foregroundStyle(MacFYITheme.textSecondary)
                            Image(systemName: "bolt.fill")
                                .foregroundStyle(p.isRunning ? MacFYITheme.caution : MacFYITheme.textTertiary)
                                .font(.caption)
                        }
                    }
                    Button(String(localized: "perf.ram.purge.button")) {
                        showPurgeInfo = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(MacFYITheme.brandPrimary)
                }
                card(String(localized: "perf.section.maint"), id: "maint") {
                    maintenanceRow(.flushDNS)
                    maintenanceRow(.diskFirstAid)
                    maintenanceRow(.spotlightRebuild)
                    maintenanceRow(.periodicScripts)
                }
            }
            .padding(24)
        }
        .background(MacFYITheme.backgroundPrimary)
        .onAppear { model.onAppear() }
        .onDisappear { model.onDisappear() }
        .alert(model.freeRAMInfoAlert().title, isPresented: $showPurgeInfo) {
            Button(String(localized: "common.ok"), role: .cancel) {}
        } message: {
            Text(model.freeRAMInfoAlert().message)
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(String(localized: "perf.title"))
                .font(.largeTitle.weight(.semibold))
                .foregroundStyle(MacFYITheme.textPrimary)
            Text(String(localized: "perf.subtitle"))
                .foregroundStyle(MacFYITheme.textSecondary)
        }
    }

    private func card(_ title: String, id: String, @ViewBuilder content: () -> some View) -> some View {
        let open = expanded.contains(id)
        return VStack(alignment: .leading, spacing: 10) {
            Button {
                if open { expanded.remove(id) } else { expanded.insert(id) }
            } label: {
                HStack {
                    Text(title)
                        .font(.headline)
                        .foregroundStyle(MacFYITheme.textPrimary)
                    Spacer()
                    Image(systemName: open ? "chevron.down" : "chevron.right")
                        .foregroundStyle(MacFYITheme.textSecondary)
                }
            }
            .buttonStyle(.plain)
            if open {
                content()
            }
        }
        .padding()
        .background(MacFYITheme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(MacFYITheme.backgroundElevated, lineWidth: 1)
        )
    }

    private func gridRow(_ label: String, _ bytes: UInt64) -> some View {
        HStack {
            Text(label)
                .foregroundStyle(MacFYITheme.textSecondary)
            Spacer()
            Text(formatBytes(bytes))
                .foregroundStyle(MacFYITheme.textPrimary)
        }
        .font(.caption)
    }

    @ViewBuilder
    private func maintenanceRow(_ kind: MaintenanceTaskKind) -> some View {
        let state = maintStates[kind] ?? MaintenanceUIState()
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(titleForMaint(kind))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(MacFYITheme.textPrimary)
                Spacer()
                if state.running {
                    ProgressView()
                        .scaleEffect(0.7)
                }
            }
            Text(descForMaint(kind))
                .font(.caption)
                .foregroundStyle(MacFYITheme.textSecondary)
            if let msg = state.lastMessage {
                Text(msg)
                    .font(.caption2)
                    .foregroundStyle(MacFYITheme.textTertiary)
            }
            Button(String(localized: "perf.maint.run")) {
                Task { await runMaint(kind) }
            }
            .disabled(state.running)
            .buttonStyle(.bordered)
        }
        .padding(8)
        .background(MacFYITheme.backgroundElevated.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func titleForMaint(_ k: MaintenanceTaskKind) -> String {
        switch k {
        case .periodicScripts: String(localized: "perf.maint.periodic.title")
        case .diskFirstAid: String(localized: "perf.maint.disk.title")
        case .flushDNS: String(localized: "perf.maint.dns.title")
        case .spotlightRebuild: String(localized: "perf.maint.spotlight.title")
        }
    }

    private func descForMaint(_ k: MaintenanceTaskKind) -> String {
        switch k {
        case .periodicScripts: String(localized: "perf.maint.periodic.desc")
        case .diskFirstAid: String(localized: "perf.maint.disk.desc")
        case .flushDNS: String(localized: "perf.maint.dns.desc")
        case .spotlightRebuild: String(localized: "perf.maint.spotlight.desc")
        }
    }

    @MainActor
    private func runMaint(_ kind: MaintenanceTaskKind) async {
        maintStates[kind] = MaintenanceUIState(lastRun: maintStates[kind]?.lastRun, lastMessage: maintStates[kind]?.lastMessage, running: true)
        do {
            let msg: String
            switch kind {
            case .flushDNS:
                msg = try await MaintenanceTasksService.flushDNS()
            case .diskFirstAid:
                msg = try await MaintenanceTasksService.verifySystemVolume()
            case .spotlightRebuild:
                msg = try await MaintenanceTasksService.rebuildSpotlight()
            case .periodicScripts:
                msg = try await MaintenanceTasksService.runPeriodicDaily()
            }
            maintStates[kind] = MaintenanceUIState(lastRun: Date(), lastMessage: msg, running: false)
        } catch {
            maintStates[kind] = MaintenanceUIState(
                lastRun: maintStates[kind]?.lastRun,
                lastMessage: error.localizedDescription,
                running: false
            )
            SoundManager.shared.play(.error)
        }
    }

    private func formatBytes(_ n: UInt64) -> String {
        let gb = Double(n) / 1_073_741_824
        if gb >= 1 { return String(format: "%.1f GB", gb) }
        let mb = Double(n) / 1_048_576
        return String(format: "%.0f MB", mb)
    }
}
