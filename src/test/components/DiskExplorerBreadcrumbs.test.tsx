import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiskExplorerBreadcrumbs } from "@/components/DiskExplorer/Breadcrumbs";
import type { Breadcrumb } from "@/store/diskExplorerStore";
import { I18nProvider } from "@/i18n/context";
import type { ReactNode } from "react";

function WithI18n({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

const items: Breadcrumb[] = [
  { label: "~", path: "~" },
  { label: "Library", path: "~/Library" },
  { label: "Caches", path: "~/Library/Caches" },
];

describe("DiskExplorerBreadcrumbs", () => {
  it("renders labels in order", () => {
    render(
      <WithI18n>
        <DiskExplorerBreadcrumbs items={items} onNavigate={vi.fn()} />
      </WithI18n>
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((b) => b.textContent)).toEqual(["~", "Library", "Caches"]);
  });

  it("calls onNavigate with index when segment clicked", () => {
    const onNavigate = vi.fn();
    render(
      <WithI18n>
        <DiskExplorerBreadcrumbs items={items} onNavigate={onNavigate} />
      </WithI18n>
    );
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]!);
    expect(onNavigate).toHaveBeenCalledWith(1);
  });

  it("highlights last segment with distinct styling class", () => {
    const { container } = render(
      <WithI18n>
        <DiskExplorerBreadcrumbs items={items} onNavigate={vi.fn()} />
      </WithI18n>
    );
    const buttons = container.querySelectorAll("button");
    expect(buttons[buttons.length - 1]?.className).toMatch(/font-medium/);
  });
});
