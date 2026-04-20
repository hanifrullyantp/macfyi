import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiskExplorerBanner } from "@/components/DiskExplorer/DiskExplorerBanner";
import { I18nProvider } from "@/i18n/context";
import type { ReactNode } from "react";

function WithI18n({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("DiskExplorerBanner", () => {
  it("shows missing FDA copy when access not confirmed", () => {
    render(
      <WithI18n>
        <DiskExplorerBanner fdaOk={false} onOpenFda={vi.fn()} />
      </WithI18n>
    );
    expect(screen.getByText(/Some system locations may be unreadable/i)).toBeInTheDocument();
  });

  it("shows OK copy when FDA granted", () => {
    render(
      <WithI18n>
        <DiskExplorerBanner fdaOk={true} onOpenFda={vi.fn()} />
      </WithI18n>
    );
    expect(screen.getByText(/Full Disk Access looks enabled/i)).toBeInTheDocument();
  });

  it("calls onOpenFda when button clicked", () => {
    const onOpenFda = vi.fn();
    render(
      <WithI18n>
        <DiskExplorerBanner fdaOk={false} onOpenFda={onOpenFda} />
      </WithI18n>
    );
    fireEvent.click(screen.getByRole("button", { name: /Open Full Disk Access settings/i }));
    expect(onOpenFda).toHaveBeenCalledTimes(1);
  });
});
