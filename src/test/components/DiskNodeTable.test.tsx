import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DiskNodeTable } from "@/components/DiskExplorer/DiskNodeTable";
import type { DiskNode } from "@/lib/types/diskExplorer";
import { I18nProvider } from "@/i18n/context";
import type { ReactNode } from "react";

const mockNode: DiskNode = {
  path: "/Users/test/Library/Caches",
  displayName: "Caches",
  redactedPath: "~/Library/Caches",
  sizeBytes: 5_368_709_120,
  itemCount: 1200,
  children: [],
  nodeType: "Cache",
  riskLevel: "Safe",
  isExpandable: true,
  isAccessible: true,
};

const lockedNode: DiskNode = {
  ...mockNode,
  displayName: "System",
  path: "/System/Library",
  redactedPath: "/System/Library",
  nodeType: "System",
  riskLevel: "Locked",
  isExpandable: false,
  isAccessible: false,
};

function WithI18n({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>;
}

describe("DiskNodeTable", () => {
  it("renders displayName", () => {
    render(
      <WithI18n>
        <DiskNodeTable
          nodes={[mockNode]}
          selectedPaths={[]}
          onToggle={vi.fn()}
          onOpenDir={vi.fn()}
          onTopFiles={vi.fn()}
        />
      </WithI18n>
    );
    expect(screen.getByText("Caches")).toBeInTheDocument();
  });

  it("calls onOpenDir when expandable name clicked", () => {
    const onOpenDir = vi.fn();
    render(
      <WithI18n>
        <DiskNodeTable
          nodes={[mockNode]}
          selectedPaths={[]}
          onToggle={vi.fn()}
          onOpenDir={onOpenDir}
          onTopFiles={vi.fn()}
        />
      </WithI18n>
    );
    fireEvent.click(screen.getByRole("button", { name: /Caches/i }));
    expect(onOpenDir).toHaveBeenCalledWith(mockNode);
  });

  it("does not call onOpenDir when row is not expandable", () => {
    const onOpenDir = vi.fn();
    render(
      <WithI18n>
        <DiskNodeTable
          nodes={[lockedNode]}
          selectedPaths={[]}
          onToggle={vi.fn()}
          onOpenDir={onOpenDir}
          onTopFiles={vi.fn()}
        />
      </WithI18n>
    );
    fireEvent.click(screen.getByRole("button", { name: /System/i }));
    expect(onOpenDir).not.toHaveBeenCalled();
  });

  it("checkbox triggers onToggle", () => {
    const onToggle = vi.fn();
    render(
      <WithI18n>
        <DiskNodeTable
          nodes={[mockNode]}
          selectedPaths={[]}
          onToggle={onToggle}
          onOpenDir={vi.fn()}
          onTopFiles={vi.fn()}
        />
      </WithI18n>
    );
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(mockNode.path);
  });

  it("checkbox is disabled for Locked inaccessible nodes", () => {
    render(
      <WithI18n>
        <DiskNodeTable
          nodes={[lockedNode]}
          selectedPaths={[]}
          onToggle={vi.fn()}
          onOpenDir={vi.fn()}
          onTopFiles={vi.fn()}
        />
      </WithI18n>
    );
    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).toBeDisabled();
  });
});
