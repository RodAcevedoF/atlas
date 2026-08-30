import { Eyebrow, PANEL } from "@/shared/ui";
import type { PublicUser } from "@atlas/domain";
import { Button, Card, cn, useToast } from "@atlas/ui";
import { Plus, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { UseAdminUsersResult } from "../hooks/use-admin-users.ts";
import type { CreateAdminUserInput } from "../repositories/admin-repository.ts";
import { CreateUserPanel } from "./create-user-panel.tsx";
import { UserDetailPanel } from "./user-detail-panel.tsx";

const ROLE_LABEL = { user: "User", admin: "Admin", super_admin: "Super admin" } as const;

function initials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

interface UserDirectoryProps {
  currentUser: PublicUser;
  directory: UseAdminUsersResult;
}

export function UserDirectory({ currentUser, directory }: UserDirectoryProps) {
  const { toast } = useToast();
  const canManage = currentUser.role === "super_admin";
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const selected = useMemo(
    () => directory.users.find((user) => user.id === selectedId) ?? directory.users[0] ?? null,
    [directory.users, selectedId],
  );

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const create = async (input: CreateAdminUserInput) => {
    try {
      await directory.create(input);
      setIsCreating(false);
      toast("User created.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not create user", "error");
    }
  };

  return (
    <Card className={cn(PANEL, "overflow-hidden")}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <Eyebrow>Directory</Eyebrow>
          <p className="mt-1 text-sm text-muted-foreground">
            {directory.users.length} loaded · {canManage ? "Full account controls" : "Read only"}
          </p>
        </div>
        {canManage ? (
          <Button type="button" variant="outline" onClick={() => setIsCreating(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add user
          </Button>
        ) : (
          <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground">
            Admin view
          </span>
        )}
      </div>

      <div className="grid min-h-[520px] lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.85fr)]">
        <div className="min-w-0 border-b border-border lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-[minmax(0,1fr)_110px_112px] gap-3 border-b border-border bg-background/25 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            <span>Account</span>
            <span>Sign-in</span>
            <span>Role</span>
          </div>
          <div className="divide-y divide-border">
            {directory.users.map((user) => (
              <button
                type="button"
                key={user.id}
                onClick={() => {
                  setSelectedId(user.id);
                  setIsCreating(false);
                }}
                className={cn(
                  "grid w-full grid-cols-[minmax(0,1fr)_110px_112px] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.035]",
                  selected?.id === user.id && !isCreating ? "bg-primary/[0.06]" : null,
                )}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 text-[10px] font-semibold text-muted-foreground">
                    {initials(user.email)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-card-foreground">
                      {user.email}
                    </span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-faint">
                      {user.id}
                    </span>
                  </span>
                </span>
                <span className="truncate text-xs capitalize text-muted-foreground">
                  {user.identityProviders.join(", ") || "None"}
                </span>
                <span className="flex items-center gap-1.5 text-xs text-card-foreground">
                  {user.role === "super_admin" ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <UserRound className="h-3.5 w-3.5 text-faint" />
                  )}
                  {ROLE_LABEL[user.role]}
                </span>
              </button>
            ))}
          </div>

          {directory.isLoading ? (
            <p className="px-4 py-5 text-sm text-muted-foreground">Loading users…</p>
          ) : null}
          {!directory.isLoading && directory.users.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No users found.</p>
          ) : null}
          {directory.nextCursor ? (
            <div className="border-t border-border p-3 text-center">
              <Button
                type="button"
                variant="ghost"
                disabled={directory.isLoading}
                onClick={() => void directory.loadMore()}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </div>

        <aside className="bg-background/20">
          {isCreating && canManage ? (
            <CreateUserPanel
              isSaving={directory.isSaving}
              onCancel={() => setIsCreating(false)}
              onCreate={create}
            />
          ) : selected ? (
            <UserDetailPanel
              user={selected}
              currentUserId={currentUser.id}
              canManage={canManage}
              isSaving={directory.isSaving}
              onUpdateEmail={directory.updateEmail}
              onResetPassword={directory.resetPassword}
              onUpdateRole={directory.updateRole}
              onDelete={directory.remove}
            />
          ) : null}
        </aside>
      </div>

      {directory.error ? (
        <p className="border-t border-border px-5 py-3 text-xs text-destructive">
          {directory.error}
        </p>
      ) : null}
    </Card>
  );
}
