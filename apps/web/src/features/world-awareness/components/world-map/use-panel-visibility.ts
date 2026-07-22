import { useCallback, useEffect, useMemo, useState } from "react";

export type PanelKey = "kpis" | "region" | "events";

type Visibility = Record<PanelKey, boolean>;

const PANEL_KEYS: PanelKey[] = ["kpis", "region", "events"];
const ALL_VISIBLE: Visibility = {
  kpis: true,
  region: true,
  events: true,
};
const ALL_HIDDEN: Visibility = {
  kpis: false,
  region: false,
  events: false,
};

export function usePanelVisibility() {
  const [visibility, setVisibility] = useState<Visibility>(ALL_VISIBLE);

  const anyVisible = useMemo(() => PANEL_KEYS.some((panel) => visibility[panel]), [visibility]);

  const toggleAll = useCallback(() => {
    setVisibility((current) =>
      PANEL_KEYS.some((panel) => current[panel]) ? ALL_HIDDEN : ALL_VISIBLE,
    );
  }, []);

  const hidePanel = useCallback((panel: PanelKey) => {
    setVisibility((current) => ({ ...current, [panel]: false }));
  }, []);

  const showPanel = useCallback((panel: PanelKey) => {
    setVisibility((current) => ({ ...current, [panel]: true }));
  }, []);

  const togglePanel = useCallback((panel: PanelKey) => {
    setVisibility((current) => ({ ...current, [panel]: !current[panel] }));
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setVisibility(ALL_HIDDEN);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return { visibility, anyVisible, toggleAll, hidePanel, showPanel, togglePanel };
}
