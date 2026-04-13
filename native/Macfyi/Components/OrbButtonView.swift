import AppKit
import SwiftUI

enum OrbVisualState: Equatable {
    case idle
    case scanning(progress: Double)
    case results
    case cleaning
}

/// Premium floating orb — bottom-trailing overlay (120pt).
struct OrbButtonView: View {
    var state: OrbVisualState
    /// When true, idle label shows performance analysis copy.
    var performanceModule: Bool = false
    var onTap: () -> Void

    @State private var hover = false
    @State private var pressed = false
    @State private var showTip = false
    @State private var pulseScale: CGFloat = 1
    private let size: CGFloat = 120
    private let ringSize: CGFloat = 130

    var body: some View {
        TimelineView(.animation(minimumInterval: 1 / 60, paused: false)) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            let bounceActive = bounceEnabled
            let bounceOffset: CGFloat = bounceActive ? CGFloat(sin(t * .pi)) * -8 : 0
            let shadowY: CGFloat = 8 - bounceOffset
            let ringSpeed: Double = scanningFastRing ? 2 * .pi / 2 : 2 * .pi / 4
            let ringRotation = Angle(radians: t * ringSpeed)

            ZStack {
                if bounceActive {
                    Circle()
                        .fill(MacFYITheme.brandGlow.opacity(0.35))
                        .frame(width: size + 20, height: size + 20)
                        .blur(radius: 30)
                        .offset(y: shadowY)
                }

                ZStack {
                    Circle()
                        .stroke(
                            AngularGradient(
                                colors: [
                                    .clear,
                                    MacFYITheme.brandGlow.opacity(0.8),
                                    .clear,
                                    MacFYITheme.brandGlow.opacity(0.4),
                                    .clear,
                                ],
                                center: .center
                            ),
                            lineWidth: 2
                        )
                        .frame(width: ringSize, height: ringSize)
                        .rotationEffect(ringRotation)
                        .opacity(ringOpacity(phase: t))

                    ZStack {
                        Circle()
                            .fill(MacFYITheme.orbGradient)
                            .overlay {
                                if case .scanning = state {
                                    Color.black.opacity(0.2)
                                }
                            }
                            .frame(width: size, height: size)

                        Ellipse()
                            .fill(Color.white.opacity(0.45))
                            .frame(width: 35, height: 20)
                            .blur(radius: 8)
                            .offset(x: -22, y: -28)

                        Ellipse()
                            .fill(MacFYITheme.brandAccent.opacity(0.2))
                            .frame(width: 20, height: 10)
                            .blur(radius: 6)
                            .offset(x: 20, y: 28)

                        orbContent(phaseTime: t)
                    }
                    .frame(width: size, height: size)
                }
                .offset(y: bounceOffset)
                .scaleEffect((hover ? 1.05 : 1) * (pressed ? 0.94 : 1) * pulseScale)
                .shadow(color: MacFYITheme.brandGlow.opacity(bounceActive ? 0.45 : 0.25), radius: bounceActive ? 28 : 18, y: shadowY)
            }
            .animation(.easeInOut(duration: 0.18), value: hover)
            .animation(.easeInOut(duration: 0.12), value: pressed)
        }
        .contentShape(Circle())
        .onTapGesture {
            NSHapticFeedbackManager.defaultPerformer.perform(.generic, performanceTime: .default)
            onTap()
        }
        .onLongPressGesture(minimumDuration: 0.5) {
            showTip = true
        }
        .popover(isPresented: $showTip, arrowEdge: .leading) {
            Text(String(localized: "orb.tooltip.tapScan"))
                .padding(8)
                .frame(width: 220)
        }
        .onHover { hover = $0 }
        .simultaneousGesture(
            DragGesture(minimumDistance: 0)
                .onChanged { _ in pressed = true }
                .onEnded { _ in pressed = false }
        )
        .onChange(of: state) { new in
            guard case .results = new else { return }
            withAnimation(.interpolatingSpring(stiffness: 200, damping: 12)) {
                pulseScale = 1.1
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                withAnimation(.interpolatingSpring(stiffness: 200, damping: 12)) {
                    pulseScale = 1
                }
            }
        }
    }

    private var bounceEnabled: Bool {
        switch state {
        case .idle, .results: return true
        case .scanning, .cleaning: return false
        }
    }

    private var scanningFastRing: Bool {
        if case .scanning = state { return true }
        return false
    }

    private func ringOpacity(phase: TimeInterval) -> Double {
        let p = (sin(phase * 2 * .pi / 3) + 1) / 2
        return 0.4 + p * 0.6
    }

    @ViewBuilder
    private func orbContent(phaseTime: TimeInterval) -> some View {
        switch state {
        case .idle:
            VStack(spacing: 4) {
                Image(systemName: "sparkles")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(MacFYITheme.textPrimary)
                Text(performanceModule ? String(localized: "orb.label.perfAnalyze") : String(localized: "orb.label.scan"))
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(MacFYITheme.textPrimary)
            }
        case .scanning(let p):
            VStack(spacing: 4) {
                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.15), lineWidth: 4)
                        .frame(width: 56, height: 56)
                    Circle()
                        .trim(from: 0, to: CGFloat(p))
                        .stroke(Color.white, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .frame(width: 56, height: 56)
                }
                Text("\(Int(p * 100))%")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(MacFYITheme.textPrimary)
            }
        case .results:
            VStack(spacing: 4) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(MacFYITheme.textPrimary)
                Text(String(localized: "orb.label.rescan"))
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(MacFYITheme.textPrimary)
            }
        case .cleaning:
            VStack(spacing: 4) {
                Image(systemName: "arrow.triangle.2.circlepath")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(MacFYITheme.textPrimary)
                    .rotationEffect(.degrees((phaseTime * 220).truncatingRemainder(dividingBy: 360)))
                Text(String(localized: "orb.label.cleaning"))
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .foregroundStyle(MacFYITheme.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
    }
}
