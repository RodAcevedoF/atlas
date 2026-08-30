import type { GrantableRole, IdentityProvider, InquiryRunStatus, UserRole } from "@atlas/domain";

export interface AdminAnalyticsRecord {
  users: {
    total: number;
    byRole: Record<UserRole, number>;
  };
  inquiries: {
    total: number;
    today: number;
    byStatus: Record<InquiryRunStatus, number>;
    retrievalCostUsd: number;
  };
}

export interface AdminUserRecord {
  id: string;
  email: string;
  emailVerified: boolean;
  role: UserRole;
  identityProviders: IdentityProvider[];
  createdAt: string;
}

export interface AdminUserPageRecord {
  users: AdminUserRecord[];
  nextCursor: string | null;
}

export interface CreateAdminUserInput {
  email: string;
  password: string;
  role: GrantableRole;
}

export interface AdminRepository {
  analytics(): Promise<AdminAnalyticsRecord>;
  users(cursor?: string): Promise<AdminUserPageRecord>;
  createUser(input: CreateAdminUserInput): Promise<void>;
  updateUserEmail(id: string, email: string): Promise<void>;
  resetUserPassword(id: string, password: string): Promise<void>;
  updateUserRole(id: string, role: GrantableRole): Promise<void>;
  deleteUser(id: string): Promise<void>;
}
