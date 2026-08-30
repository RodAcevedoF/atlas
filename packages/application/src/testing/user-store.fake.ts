import type { User, UserId, UserRole } from "@atlas/domain";
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
    updateEmail(id, email) {
      const user = held.get(id);
      if (!user) return Promise.reject(new Error(`unknown user ${id}`));
      held.set(id, {
        ...user,
        email,
        identities: user.identities.map((identity) =>
          identity.provider === "password" ? { ...identity, email } : identity,
        ),
      });
      return Promise.resolve();
    },
    setPasswordIdentity(id, identity) {
      const user = held.get(id);
      if (!user) return Promise.reject(new Error(`unknown user ${id}`));
      held.set(id, {
        ...user,
        identities: [
          ...user.identities.filter((candidate) => candidate.provider !== "password"),
          identity,
        ],
      });
      return Promise.resolve();
    },
    deleteUser(id) {
      held.delete(id);
      return Promise.resolve();
    },
    installSuperAdmin: () => unreachable("installSuperAdmin"),
    createUser(user) {
      held.set(user.id, user);
      return Promise.resolve();
    },
    findUserByEmail(email) {
      return Promise.resolve([...held.values()].find((user) => user.email === email) ?? null);
    },
    findUserByIdentity(identity) {
      const user = [...held.values()].find((candidate) =>
        candidate.identities.some(
          (stored) =>
            stored.provider === identity.provider &&
            stored.providerUserId === identity.providerUserId,
        ),
      );
      return Promise.resolve(user ?? null);
    },
    updateProfile: () => unreachable("updateProfile"),
    linkIdentity: () => unreachable("linkIdentity"),
    markEmailVerified: () => unreachable("markEmailVerified"),
    countUsersByRole() {
      const counts: Partial<Record<UserRole, number>> = {};
      for (const user of held.values()) {
        counts[user.role] = (counts[user.role] ?? 0) + 1;
      }
      return Promise.resolve(counts);
    },
    listUsers({ limit, cursor }) {
      const ordered = [...held.values()].sort((left, right) => {
        const byDate = right.createdAt.getTime() - left.createdAt.getTime();
        return byDate || right.id.localeCompare(left.id);
      });
      const start = cursor ? ordered.findIndex((user) => user.id === cursor) + 1 : 0;
      const users = ordered.slice(start, start + limit);
      const nextCursor = start + limit < ordered.length ? (users.at(-1)?.id ?? null) : null;
      return Promise.resolve({ users, nextCursor });
    },
  };

  return { store, users: () => [...held.values()] };
}
