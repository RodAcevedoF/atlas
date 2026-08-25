import { TriangleAlert } from "lucide-react";
import { Component, type ErrorInfo, type PropsWithChildren, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ErrorView } from "./error-view.tsx";

interface RenderErrorBoundaryProps extends PropsWithChildren {
  locationKey: string;
}

interface RenderErrorBoundaryState {
  failed: boolean;
}

class RenderErrorBoundary extends Component<RenderErrorBoundaryProps, RenderErrorBoundaryState> {
  state: RenderErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): RenderErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(caught: Error, info: ErrorInfo) {
    console.error("Unhandled render error", caught, info.componentStack);
  }

  componentDidUpdate(previous: RenderErrorBoundaryProps) {
    const navigated = previous.locationKey !== this.props.locationKey;
    if (this.state.failed && navigated) this.setState({ failed: false });
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <ErrorView
        code="Render fault"
        tone="warning"
        icon={TriangleAlert}
        title="This page stopped responding"
        message="Atlas couldn't finish drawing it. Heading back usually clears the fault."
      />
    );
  }
}

export function AppErrorBoundary({ children }: PropsWithChildren) {
  const { key } = useLocation();

  return <RenderErrorBoundary locationKey={key}>{children}</RenderErrorBoundary>;
}
