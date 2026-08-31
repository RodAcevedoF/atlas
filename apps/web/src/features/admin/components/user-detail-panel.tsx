import { CTA_PRIMARY, Eyebrow } from "@/shared/ui";
import type { GrantableRole } from "@atlas/domain";
import { GRANTABLE_ROLES } from "@atlas/domain";
import { Button, cn, useToast } from "@atlas/ui";
import { CheckCircle2, KeyRound, Shield, Trash2 } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import type { AdminUserRecord } from "../repositories/admin-repository.ts";
import { ADMIN_FIELD } from "../utils/admin-form.ts";
import { AdminSelect } from "./admin-select.tsx";
const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

interface UserDetailPanelProps {
  user: AdminUserRecord;
  currentUserId: string;
  canManage: boolean;
  isSaving: boolean;
  onUpdateEmail: (id: string, email: string) => Promise<void>;
  onResetPassword: (id: string, password: string) => Promise<void>;
  onUpdateRole: (id: string, role: GrantableRole) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function formatJoined(value: string): string {
  return DATE_FORMATTER.format(new Date(value));
}

export function UserDetailPanel({
  user,
  currentUserId,
  canManage,
  isSaving,
  onUpdateEmail,
  onResetPassword,
  onUpdateRole,
  onDelete,
}: UserDetailPanelProps) {
  const { toast } = useToast();
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<GrantableRole>(user.role === "admin" ? "admin" : "user");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const protectedAccount = user.role === "super_admin";

  useEffect(() => {
    setEmail(user.email);
    setPassword("");
    setRole(user.role === "admin" ? "admin" : "user");
    setConfirmDelete(false);
  }, [user]);

  const saveEmail = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onUpdateEmail(user.id, email);
      toast("Email updated.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not update email", "error");
    }
  };

  const savePassword = async (event: FormEvent) => {
    event.preventDefault();
    try {
      await onResetPassword(user.id, password);
      setPassword("");
      toast("Password set.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not set password", "error");
    }
  };

  const saveRole = async () => {
    try {
      await onUpdateRole(user.id, role);
      toast("Role updated.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not update role", "error");
    }
  };

  const remove = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await onDelete(user.id);
      toast("User and owned data deleted.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not delete user", "error");
    }
  };

  return (
    <div className="flex min-h-full flex-col p-5">
      <div>
        <Eyebrow>User detail</Eyebrow>
        <h2 className="mt-2 break-all text-xl font-semibold tracking-[-0.025em] text-card-foreground">
          {user.email}
        </h2>
        <p className="mt-1 font-mono text-[11px] text-faint">{user.id}</p>
      </div>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-xl bg-border">
        <div className="flex items-center justify-between bg-panel-cell px-3.5 py-3">
          <dt className="text-xs text-muted-foreground">Status</dt>
          <dd className="flex items-center gap-1.5 text-xs text-card-foreground">
            <CheckCircle2
              className={cn("h-3.5 w-3.5", user.emailVerified ? "text-primary" : "text-faint")}
            />
            {user.emailVerified ? "Verified" : "Unverified"}
          </dd>
        </div>
        <div className="flex items-center justify-between bg-panel-cell px-3.5 py-3">
          <dt className="text-xs text-muted-foreground">Joined</dt>
          <dd className="text-right text-xs text-card-foreground">
            {formatJoined(user.createdAt)}
          </dd>
        </div>
        <div className="flex items-center justify-between bg-panel-cell px-3.5 py-3">
          <dt className="text-xs text-muted-foreground">Sign-in</dt>
          <dd className="text-right text-xs capitalize text-card-foreground">
            {user.identityProviders.join(", ") || "None"}
          </dd>
        </div>
      </dl>

      {!canManage ? (
        <div className="mt-5 rounded-xl border border-border bg-background/30 p-3.5 text-xs leading-relaxed text-muted-foreground">
          User management is read-only for admins. A super admin can edit account access.
        </div>
      ) : (
        <div className="mt-6 grid gap-6">
          <form onSubmit={(event) => void saveEmail(event)} className="grid gap-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-user-email">
              Email
            </label>
            <div className="flex gap-2">
              <input
                id="admin-user-email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={ADMIN_FIELD}
              />
              <Button type="submit" variant="outline" disabled={isSaving || email === user.email}>
                Save
              </Button>
            </div>
          </form>

          <div className="grid gap-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor={protectedAccount ? undefined : "admin-user-role"}
            >
              Access role
            </label>
            <div className="flex gap-2">
              {protectedAccount ? (
                <div className={cn(ADMIN_FIELD, "flex items-center opacity-60")}>Super admin</div>
              ) : (
                <AdminSelect
                  id="admin-user-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as GrantableRole)}
                >
                  {GRANTABLE_ROLES.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {candidate === "admin" ? "Admin" : "User"}
                    </option>
                  ))}
                </AdminSelect>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isSaving || protectedAccount || role === user.role}
                onClick={() => void saveRole()}
              >
                <Shield className="h-3.5 w-3.5" />
                Apply
              </Button>
            </div>
            {protectedAccount ? (
              <p className="text-[11px] text-muted-foreground">Super-admin access is protected.</p>
            ) : null}
          </div>

          <form onSubmit={(event) => void savePassword(event)} className="grid gap-2">
            <label
              className="text-xs font-medium text-muted-foreground"
              htmlFor="admin-user-password"
            >
              Set password
            </label>
            <div className="flex gap-2">
              <input
                id="admin-user-password"
                type="password"
                required
                minLength={8}
                maxLength={200}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className={ADMIN_FIELD}
                placeholder="At least 8 characters"
              />
              <Button type="submit" variant="outline" disabled={isSaving || password.length < 8}>
                <KeyRound className="h-3.5 w-3.5" />
                Set
              </Button>
            </div>
          </form>
        </div>
      )}

      {canManage && !protectedAccount && user.id !== currentUserId ? (
        <div className="mt-auto border-t border-border pt-5">
          <Button
            type="button"
            variant={confirmDelete ? "destructive" : "outline"}
            disabled={isSaving}
            onClick={() => void remove()}
            className="w-full"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {confirmDelete ? "Confirm user and data deletion" : "Delete user"}
          </Button>
          {confirmDelete ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="mt-2 w-full text-center text-xs text-muted-foreground hover:text-card-foreground"
            >
              Cancel
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
