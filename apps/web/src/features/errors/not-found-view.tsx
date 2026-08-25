import { MapPinOff } from "lucide-react";
import { ErrorView } from "./error-view.tsx";

export function NotFoundView() {
  return (
    <ErrorView
      code="Error 404"
      tone="info"
      icon={MapPinOff}
      title="That page isn't on the map"
      message="The link may be mistyped, or the page has moved since you last saw it."
    />
  );
}
