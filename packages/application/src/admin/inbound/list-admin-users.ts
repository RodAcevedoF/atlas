import type { IdentityProvider, User } from "@atlas/domain";
import type { UserStorePort } from "../../auth/outbound/user-store.ts";

export const ADMIN_USER_PAGE_DEFAULT = 25;
export const ADMIN_USER_PAGE_MAX = 50;

export interface AdminUserRecord {
  id: string;
  email: string;
  emailVerified: boolean;
  role: User["role"];
  identityProviders: IdentityProvider[];
  createdAt: Date;
}

export interface AdminUserPage {
  users: AdminUserRecord[];
  nextCursor: string | null;
}

export interface ListAdminUsersInput {
  limit?: number;
  cursor?: string;
}

export interface ListAdminUsers {
  execute(input?: ListAdminUsersInput): Promise<AdminUserPage>;
}

export class InvalidAdminUserCursorError extends Error {
  constructor() {
    super("Invalid user page cursor");
    this.name = "InvalidAdminUserCursorError";
  }
}

function toAdminUser(user: User): AdminUserRecord {
  return {
    id: user.id,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
    identityProviders: [...new Set(user.identities.map((identity) => identity.provider))],
    createdAt: user.createdAt,
  };
}

export class ListAdminUsersUseCase implements ListAdminUsers {
  constructor(private readonly users: UserStorePort) {}

  async execute(input: ListAdminUsersInput = {}): Promise<AdminUserPage> {
    const limit = Math.min(
      Math.max(input.limit ?? ADMIN_USER_PAGE_DEFAULT, 1),
      ADMIN_USER_PAGE_MAX,
    );
    const page = await this.users.listUsers({ limit, cursor: input.cursor });
    return { users: page.users.map(toAdminUser), nextCursor: page.nextCursor };
  }
}
