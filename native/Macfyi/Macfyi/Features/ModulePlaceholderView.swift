import SwiftUI

struct ModulePlaceholderView: View {
    let titleKey: LocalizedStringKey
    let subtitleKey: LocalizedStringKey

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(titleKey)
                .font(.largeTitle.weight(.semibold))
                .foregroundStyle(MacFYITheme.textPrimary)
            Text(subtitleKey)
                .foregroundStyle(MacFYITheme.textSecondary)
            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(24)
        .background(MacFYITheme.backgroundPrimary)
    }
}
