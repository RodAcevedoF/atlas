import type { User, UserId } from "@atlas/domain";
import type { UserStorePort } from "../auth/outbound/user-store.ts";

export interface InMemoryUserStore {
  store: UserStorePort;
  users(): User[];
}

function unreachable(method: string): never {
  throw new Error(`${method} is outside the path under test`);
}

export function inMemoryUserStore(seed: User[] = []): InMemoryUserStore {
  const held = new Map<UserId, User>(seed.map((user) => [user.id, user]));

  const store: UserStorePort = {
    findUserById: (id) => Promise.resolve(held.get(id) ?? null),
    updateRole(id, role) {
      const user = held.get(id);
      if (!user) return Promise.reject(new Error(`unknown user ${id}`));
      held.set(id, { ...user, role });
      return Promise.resolve();
    },
    installSuperAdmin: () => unreachable("installSuperAdmin"),
    createUser: () => unreachable("createUser"),
    findUserByEmail: () => unreachable("findUserByEmail"),
    updateProfile: () => unreachable("updateProfile"),
    linkIdentity: () => unreachable("linkIdentity"),
    markEmailVerified: () => unreachable("markEmailVerified"),
  };

  return { store, users: () => [...held.values()] };
}
