import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "../ui/Button";

export function RouteErrorBoundary() {
  const err = useRouteError();
  let message = "Something went wrong.";
  if (isRouteErrorResponse(err)) {
    message = `${err.status} ${err.statusText}`;
  } else if (err instanceof Error) {
    message = err.message;
  }
  return (
    <div className="flex min-h-[40vh] flex-col items-start justify-center gap-4 rounded-xl border border-red-900/50 bg-red-950/20 p-6">
      <h2 className="text-lg font-semibold text-red-200">Route error</h2>
      <pre className="max-h-48 max-w-full overflow-auto whitespace-pre-wrap break-words text-sm text-red-100/90">{message}</pre>
      <Button variant="secondary" size="sm" onClick={() => window.location.assign(window.location.pathname)}>
        Reload page
      </Button>
    </div>
  );
}
