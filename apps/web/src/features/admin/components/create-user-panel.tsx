import { CTA_PRIMARY, Eyebrow } from "@/shared/ui";
import type { GrantableRole } from "@atlas/domain";
import { GRANTABLE_ROLES } from "@atlas/domain";
import { Button, cn } from "@atlas/ui";
import { type FormEvent, useState } from "react";
import type { CreateAdminUserInput } from "../repositories/admin-repository.ts";
import { ADMIN_FIELD } from "../utils/admin-form.ts";

interface CreateUserPanelProps {
  isSaving: boolean;
  onCancel: () => void;
  onCreate: (input: CreateAdminUserInput) => Promise<void>;
}

export function CreateUserPanel({ isSaving, onCancel, onCreate }: CreateUserPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<GrantableRole>("user");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onCreate({ email, password, role });
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-5 p-5">
      <div>
        <Eyebrow>New account</Eyebrow>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-card-foreground">
          Create a user
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Provision a verified password account. The user can sign in immediately.
        </p>
      </div>

      <label className="grid gap-2 text-xs font-medium text-muted-foreground">
        Email
        <input
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={ADMIN_FIELD}
          placeholder="person@example.com"
        />
      </label>

      <label className="grid gap-2 text-xs font-medium text-muted-foreground">
        Temporary password
        <input
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
      </label>

      <label className="grid gap-2 text-xs font-medium text-muted-foreground">
        Role
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as GrantableRole)}
          className={ADMIN_FIELD}
        >
          {GRANTABLE_ROLES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate === "admin" ? "Admin" : "User"}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-auto flex gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant={null}
          className={cn(CTA_PRIMARY, "ml-auto")}
          disabled={isSaving}
        >
          {isSaving ? "Creating…" : "Create user"}
        </Button>
      </div>
    </form>
  );
}
