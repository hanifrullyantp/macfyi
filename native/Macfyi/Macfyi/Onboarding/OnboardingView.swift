import AppKit
import SwiftUI

struct OnboardingView: View {
    @Binding var isPresented: Bool
    @AppStorage("hasCompletedOnboarding") private var hasCompletedOnboarding = false
    @State private var page = 0
    @State private var dragOffset: CGFloat = 0

    var onFinishedFirstScan: () -> Void

    private let slideCount = 6

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    hasCompletedOnboarding = true
                    isPresented = false
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(MacFYITheme.textSecondary)
                }
                .buttonStyle(.plain)
                .padding(12)
                Spacer()
            }
            HStack(spacing: 0) {
                leftPanel
                    .frame(width: 420)
                rightPanel
                    .frame(width: 480)
            }
            .frame(height: 480)
        }
        .frame(width: 900, height: 560)
        .background(MacFYITheme.backgroundCard)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(MacFYITheme.backgroundElevated, lineWidth: 1)
        )
    }

    private var leftPanel: some View {
        Group {
            switch page {
            case 0: OnboardSlide1Visual()
            case 1: OnboardSlide2Visual()
            case 2: OnboardSlide3Visual()
            case 3: OnboardSlide4Visual()
            case 4: OnboardSlide5Visual()
            default: OnboardSlide6Visual()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var rightPanel: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Spacer()
                progressDots
            }
            .padding(.bottom, 4)

            TabView(selection: $page) {
                slideWelcome.tag(0)
                slideClean.tag(1)
                slidePerf.tag(2)
                slideUninstall.tag(3)
                slideAI.tag(4)
                slidePermissions.tag(5)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
            .frame(maxHeight: .infinity)
        }
        .padding(24)
        .background(MacFYITheme.backgroundSecondary)
    }

    private var progressDots: some View {
        HStack(spacing: 6) {
            ForEach(0 ..< slideCount, id: \.self) { i in
                Circle()
                    .fill(i == page ? Color.white : Color.white.opacity(0.3))
                    .frame(width: i == page ? 8 : 6, height: i == page ? 8 : 6)
                    .animation(.spring(duration: 0.4, bounce: 0.1), value: page)
            }
        }
    }

    private var slideWelcome: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "onboard.welcome.title"))
                .font(.title.weight(.bold))
                .foregroundStyle(MacFYITheme.textPrimary)
            Text(String(localized: "onboard.welcome.subtitle"))
                .foregroundStyle(MacFYITheme.textSecondary)
            Spacer()
            Button(String(localized: "onboard.welcome.cta")) {
                withAnimation(.spring(duration: 0.4, bounce: 0.1)) { page = 1 }
            }
            .buttonStyle(OnboardPrimaryButtonStyle())
        }
    }

    private var slideClean: some View {
        slideTemplate(
            title: String(localized: "onboard.clean.title"),
            body: String(localized: "onboard.clean.body"),
            pills: [String(localized: "onboard.clean.p1"), String(localized: "onboard.clean.p2"), String(localized: "onboard.clean.p3")],
            nextPage: 2
        )
    }

    private var slidePerf: some View {
        slideTemplate(
            title: String(localized: "onboard.perf.title"),
            body: String(localized: "onboard.perf.body"),
            pills: [String(localized: "onboard.perf.p1"), String(localized: "onboard.perf.p2"), String(localized: "onboard.perf.p3")],
            nextPage: 3
        )
    }

    private var slideUninstall: some View {
        slideTemplate(
            title: String(localized: "onboard.uninstall.title"),
            body: String(localized: "onboard.uninstall.body"),
            pills: [String(localized: "onboard.uninstall.p1"), String(localized: "onboard.uninstall.p2"), String(localized: "onboard.uninstall.p3")],
            nextPage: 4
        )
    }

    private var slideAI: some View {
        slideTemplate(
            title: String(localized: "onboard.ai.title"),
            body: String(localized: "onboard.ai.body"),
            pills: [String(localized: "onboard.ai.p1"), String(localized: "onboard.ai.p2"), String(localized: "onboard.ai.p3")],
            nextPage: 5
        )
    }

    private func slideTemplate(title: String, body: String, pills: [String], nextPage: Int) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title2.weight(.bold))
                .foregroundStyle(MacFYITheme.textPrimary)
            Text(body)
                .foregroundStyle(MacFYITheme.textSecondary)
            FlowPills(labels: pills)
            Spacer()
            Button(String(localized: "onboard.next")) {
                withAnimation(.spring(duration: 0.4, bounce: 0.1)) { page = nextPage }
            }
            .buttonStyle(OnboardPrimaryButtonStyle())
        }
    }

    private var slidePermissions: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(String(localized: "onboard.perm.title"))
                .font(.title2.weight(.bold))
                .foregroundStyle(MacFYITheme.textPrimary)
            Text(String(localized: "onboard.perm.body"))
                .foregroundStyle(MacFYITheme.textSecondary)
            VStack(alignment: .leading, spacing: 8) {
                ForEach(FolderBookmarkStore.Kind.allCases, id: \.rawValue) { kind in
                    HStack {
                        Text(iconFor(kind))
                        Text(labelFor(kind))
                            .foregroundStyle(MacFYITheme.textPrimary)
                        Spacer()
                        Button(String(localized: "onboard.perm.allow")) {
                            pickFolder(kind: kind)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(MacFYITheme.brandPrimary)
                    }
                    .padding(8)
                    .background(MacFYITheme.backgroundElevated.opacity(0.6))
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                }
            }
            Spacer()
            Button(String(localized: "onboard.perm.cta")) {
                hasCompletedOnboarding = true
                isPresented = false
                AppNotifications.requestAuthorizationIfNeeded()
                onFinishedFirstScan()
            }
            .buttonStyle(OnboardPrimaryButtonStyle())
        }
    }

    private func iconFor(_ k: FolderBookmarkStore.Kind) -> String {
        switch k {
        case .documents: "📁"
        case .downloads: "📥"
        case .desktop: "🖥"
        }
    }

    private func labelFor(_ k: FolderBookmarkStore.Kind) -> String {
        switch k {
        case .documents: String(localized: "onboard.permission.documents")
        case .downloads: String(localized: "onboard.permission.downloads")
        case .desktop: String(localized: "onboard.permission.desktop")
        }
    }

    private func pickFolder(kind: FolderBookmarkStore.Kind) {
        let p = NSOpenPanel()
        p.canChooseFiles = false
        p.canChooseDirectories = true
        p.allowsMultipleSelection = false
        p.directoryURL = kind.systemURL()
        p.prompt = String(localized: "onboard.perm.choose")
        p.begin { resp in
            guard resp == .OK, let url = p.url else { return }
            try? FolderBookmarkStore.saveBookmark(for: url, kind: kind)
        }
    }
}

// MARK: - Visual panels (Canvas / symbols)

private struct OnboardSlide1Visual: View {
    @State private var float: CGFloat = 0
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#8B0000"), Color(hex: "#C0392B"), Color(hex: "#FF6B6B")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            ZStack {
                Circle()
                    .fill(MacFYITheme.orbGradient)
                    .frame(width: 140, height: 140)
                    .shadow(color: MacFYITheme.brandGlow.opacity(0.6), radius: 24, y: 12)
                    .offset(y: float)
                Image(systemName: "trash.fill")
                    .font(.title)
                    .foregroundStyle(.white.opacity(0.9))
                    .offset(x: -70, y: -40 + float * 0.3)
                Image(systemName: "sparkles")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.95))
                    .offset(x: 72, y: 30 - float * 0.2)
                Image(systemName: "shield.checkered")
                    .font(.title2)
                    .foregroundStyle(.white.opacity(0.9))
                    .offset(x: 50, y: -50 + float * 0.15)
            }
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 2).repeatForever(autoreverses: true)) {
                float = -10
            }
        }
    }
}

private struct OnboardSlide2Visual: View {
    @State private var t: CGFloat = 0
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#1A4A1A"), Color(hex: "#27AE60"), Color(hex: "#52D68A")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Image(systemName: "folder.fill")
                .font(.system(size: 80))
                .foregroundStyle(.white.opacity(0.95))
                .scaleEffect(1 + sin(t) * 0.04)
            Text("-2.3 GB")
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .offset(y: -80 + sin(t * 2) * 6)
                .opacity(0.85)
        }
        .onAppear {
            withAnimation(.linear(duration: 4).repeatForever(autoreverses: false)) {
                t = .pi * 2
            }
        }
    }
}

private struct OnboardSlide3Visual: View {
    @State private var needle: Double = -35
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#1A1A4A"), Color(hex: "#2C3E8C"), Color(hex: "#4A6CF7")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            ZStack {
                Circle()
                    .trim(from: 0.15, to: 0.85)
                    .stroke(Color.white.opacity(0.4), lineWidth: 10)
                    .frame(width: 140, height: 140)
                Circle()
                    .fill(Color.orange)
                    .frame(width: 8, height: 8)
                    .offset(y: 50)
                Rectangle()
                    .fill(Color.white)
                    .frame(width: 3, height: 48)
                    .offset(y: -24)
                    .rotationEffect(.degrees(needle), anchor: .bottom)
            }
            VStack {
                Text(String(localized: "onboard.demo.login"))
                Text(String(localized: "onboard.demo.bg"))
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white.opacity(0.95))
            .offset(y: 88)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 1.2)) {
                needle = 35
            }
        }
    }
}

private struct OnboardSlide4Visual: View {
    @State private var hide = false
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#2A1A4A"), Color(hex: "#6C3483"), Color(hex: "#A569BD")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 44))], spacing: 8) {
                ForEach(0 ..< 9, id: \.self) { i in
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.white.opacity(i == 4 && hide ? 0 : 0.25))
                        .frame(width: 44, height: 44)
                        .overlay {
                            if i == 4 {
                                Image(systemName: "app.fill")
                                    .foregroundStyle(.white)
                                    .opacity(hide ? 0 : 1)
                            }
                        }
                }
            }
            .padding(24)
            Text(String(localized: "onboard.demo.save"))
                .font(.headline.weight(.bold))
                .foregroundStyle(.white)
                .offset(y: 100)
                .opacity(hide ? 1 : 0.3)
        }
        .onAppear {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                withAnimation(.spring(duration: 0.6, bounce: 0.2)) {
                    hide = true
                }
            }
        }
    }
}

private struct OnboardSlide5Visual: View {
    @State private var step = 0
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#0A1628"), Color(hex: "#1A3A5C"), Color(hex: "#2E6DA4")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            VStack(alignment: .leading, spacing: 8) {
                if step >= 0 {
                    bubble(String(localized: "onboard.demo.q"), alignRight: false)
                }
                if step >= 1 {
                    bubble(String(localized: "onboard.demo.a"), alignRight: true)
                }
            }
            .padding(20)
        }
        .onAppear {
            step = 0
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) { withAnimation(.spring) { step = 1 } }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) { withAnimation(.spring) { step = 2 } }
        }
    }

    private func bubble(_ text: String, alignRight: Bool) -> some View {
        Text(text)
            .font(.caption)
            .padding(10)
            .background(alignRight ? Color.white.opacity(0.2) : Color.black.opacity(0.25))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity, alignment: alignRight ? .trailing : .leading)
    }
}

private struct OnboardSlide6Visual: View {
    @State private var unlocked = false
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color(hex: "#1A0A0A"), Color(hex: "#4A0E0E"), Color(hex: "#C0392B")],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            VStack(spacing: 12) {
                Circle()
                    .fill(MacFYITheme.orbGradient)
                    .frame(width: 100, height: 100)
                Image(systemName: unlocked ? "lock.open.fill" : "lock.fill")
                    .font(.largeTitle)
                    .foregroundStyle(.white)
                    .rotationEffect(.degrees(unlocked ? 0 : 0))
                Text(String(localized: "onboard.perm.privacy"))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.95))
            }
        }
        .onAppear {
            withAnimation(.spring(duration: 0.6, bounce: 0.3)) {
                unlocked = true
            }
        }
    }
}

private struct FlowPills: View {
    let labels: [String]
    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(labels, id: \.self) { t in
                Text(t)
                    .font(.caption.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(MacFYITheme.backgroundElevated)
                    .clipShape(Capsule())
                    .foregroundStyle(MacFYITheme.textPrimary)
            }
        }
    }
}

/// Simple flow layout for pills.
private struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let arr = arrange(proposal: proposal, subviews: subviews)
        for (i, sub) in subviews.enumerated() {
            sub.place(at: CGPoint(x: bounds.minX + arr.frames[i].minX, y: bounds.minY + arr.frames[i].minY), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, frames: [CGRect]) {
        var x: CGFloat = 0
        var y: CGFloat = 0
        var lineH: CGFloat = 0
        var frames: [CGRect] = []
        let maxW = proposal.width ?? 440
        for sub in subviews {
            let s = sub.sizeThatFits(.unspecified)
            if x + s.width > maxW, x > 0 {
                x = 0
                y += lineH + spacing
                lineH = 0
            }
            frames.append(CGRect(x: x, y: y, width: s.width, height: s.height))
            lineH = max(lineH, s.height)
            x += s.width + spacing
        }
        let h = y + lineH
        return (CGSize(width: maxW, height: h), frames)
    }
}

private struct OnboardPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(MacFYITheme.brandGradient)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .foregroundStyle(Color.white)
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}
