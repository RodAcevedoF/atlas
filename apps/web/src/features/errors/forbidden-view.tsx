import { ShieldOff } from "lucide-react";
import { ErrorView } from "./error-view.tsx";

export function ForbiddenView() {
  return (
    <ErrorView
      code="Error 403"
      tone="warning"
      icon={ShieldOff}
      title="You don't have access to this"
      message="Your account is signed in, but this area needs a higher level of access than it carries."
    />
  );
}
