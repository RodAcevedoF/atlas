import { useAuth } from "@/features/auth/auth-provider.tsx";
import { SEGMENT_GROUP, segmentItemClass } from "@/shared/ui";
import { hasAtLeastRole } from "@atlas/domain";
import { NavLink } from "react-router-dom";

const TABS: Array<{ to: string; label: string }> = [
  { to: "/world", label: "World" },
  { to: "/intelligence", label: "Intelligence" },
];

const ADMIN_TAB = { to: "/admin", label: "Admin" };

export function AppNavTabs() {
  const { user } = useAuth();
  const tabs = user && hasAtLeastRole(user.role, "admin") ? [...TABS, ADMIN_TAB] : TABS;

  return (
    <nav className={SEGMENT_GROUP}>
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} className={({ isActive }) => segmentItemClass(isActive)}>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
