import SwiftUI

/// App display name — always "Macfyi" (lowercase f, y, i).
enum MacfyiAppName {
    static let value = "Macfyi"
}

// MARK: — Brand & design tokens (single source of truth for colors)

enum MacFYITheme {
    // MARK: Brand Colors
    static let brandPrimary = Color(hex: "#C0392B")
    static let brandPrimaryHover = Color(hex: "#A93226")
    static let brandGlow = Color(hex: "#E74C3C")
    static let brandAccent = Color(hex: "#FF6B6B")

    static let brandGradient = LinearGradient(
        colors: [
            Color(hex: "#8B0000"),
            Color(hex: "#C0392B"),
            Color(hex: "#E74C3C"),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let orbGradient = RadialGradient(
        colors: [
            Color(hex: "#FF6B6B"),
            Color(hex: "#C0392B"),
            Color(hex: "#7B241C"),
            Color(hex: "#4A0E0E"),
        ],
        center: UnitPoint(x: 0.35, y: 0.3),
        startRadius: 5,
        endRadius: 75
    )

    // MARK: Neutrals
    static let backgroundPrimary = Color(hex: "#0F0F0F")
    static let backgroundSecondary = Color(hex: "#1A1A1A")
    static let backgroundCard = Color(hex: "#1E1E1E")
    static let backgroundElevated = Color(hex: "#252525")
    static let sidebarBackground = Color(hex: "#141414")

    // MARK: Semantic
    static let safe = Color(hex: "#27AE60")
    static let caution = Color(hex: "#F39C12")
    static let risky = Color(hex: "#E74C3C")

    // MARK: Text
    static let textPrimary = Color.white
    static let textSecondary = Color(hex: "#A0A0A0")
    static let textTertiary = Color(hex: "#606060")

    // MARK: Sidebar
    static let sidebarActiveBackground = Color(hex: "#C0392B").opacity(0.25)
    static let sidebarActiveIndicator = Color(hex: "#E74C3C")
}
