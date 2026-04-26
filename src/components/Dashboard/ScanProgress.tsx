import type { ComponentProps } from "react";
import { Scanner } from "../Scanner";

type ScannerProps = ComponentProps<typeof Scanner>;

/** Smart Care scan step: wraps `Scanner` with dashboard phase copy (EN/ID buckets). */
export function ScanProgress(props: Omit<ScannerProps, "dashboardPhaseCopy">) {
  return <Scanner {...props} dashboardPhaseCopy />;
}
