import { cn } from "@atlas/ui";
import { NavLink } from "react-router-dom";

const TABS: Array<{ to: string; label: string }> = [
  { to: "/app", label: "Dashboard" },
  { to: "/intelligence", label: "Intelligence" },
];

export function AppNavTabs() {
  return (
    <nav className="flex items-center gap-0.5 rounded-[11px] border border-border bg-muted p-0.75">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              "flex h-6.75 items-center rounded-lg px-3.25 text-xs font-medium transition-colors",
              isActive
                ? "bg-white/8 text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,.08)]"
                : "text-muted-foreground hover:text-foreground",
            )
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
