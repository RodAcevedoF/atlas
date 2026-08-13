import { SEGMENT_GROUP, segmentItemClass } from "@/shared/ui";
import { NavLink } from "react-router-dom";

const TABS: Array<{ to: string; label: string }> = [
  { to: "/world", label: "World" },
  { to: "/intelligence", label: "Intelligence" },
];

export function AppNavTabs() {
  return (
    <nav className={SEGMENT_GROUP}>
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => segmentItemClass(isActive)}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
