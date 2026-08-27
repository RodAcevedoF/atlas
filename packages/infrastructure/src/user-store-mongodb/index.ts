import type { UserStorePort } from "@atlas/application";
import type {
  GrantableRole,
  User,
  UserId,
  UserIdentity,
  UserProfile,
  UserRole,
} from "@atlas/domain";
import { makeUserId } from "@atlas/domain";
import type { Db } from "mongodb";

interface UserDoc {
  _id: string;
  email: string;
  emailVerified?: boolean;
  role?: UserRole;
  identities: UserIdentity[];
  profile: UserProfile;
  createdAt: Date;
  passwordHash?: string;
}

function docToIdentities(doc: UserDoc): UserIdentity[] {
  if (doc.identities?.length) return doc.identities;
  if (doc.passwordHash) {
    return [
      { provider: "password", providerUserId: doc._id, email: doc.email, secret: doc.passwordHash },
    ];
  }
  return [];
}

function docToUser(doc: UserDoc): User {
  return {
    id: makeUserId(doc._id),
    email: doc.email,
    // Legacy docs predate verification → treat as verified so they aren't locked out.
    emailVerified: doc.emailVerified ?? true,
    role: doc.role ?? "user",
    identities: docToIdentities(doc),
    profile: doc.profile,
    createdAt: doc.createdAt,
  };
}

export class MongoUserStore implements UserStorePort {
  constructor(private readonly db: Db) {}

  async createUser(user: User): Promise<void> {
    const doc: UserDoc = {
      _id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      role: user.role,
      identities: user.identities,
      profile: user.profile,
      createdAt: user.createdAt,
    };
    await this.db.collection<UserDoc>("users").insertOne(doc);
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const doc = await this.db.collection<UserDoc>("users").findOne({ email });
    return doc ? docToUser(doc) : null;
  }

  async findUserById(id: UserId): Promise<User | null> {
    const doc = await this.db.collection<UserDoc>("users").findOne({ _id: id });
    return doc ? docToUser(doc) : null;
  }

  async updateProfile(id: UserId, profile: UserProfile): Promise<void> {
    await this.db.collection<UserDoc>("users").updateOne({ _id: id }, { $set: { profile } });
  }

  async updateRole(id: UserId, role: GrantableRole): Promise<void> {
    await this.db.collection<UserDoc>("users").updateOne({ _id: id }, { $set: { role } });
  }

  async installSuperAdmin(id: UserId): Promise<void> {
    await this.db
      .collection<UserDoc>("users")
      .updateOne({ _id: id }, { $set: { role: "super_admin" } });
  }

  async linkIdentity(id: UserId, identity: UserIdentity): Promise<void> {
    await this.db
      .collection<UserDoc>("users")
      .updateOne({ _id: id }, { $push: { identities: identity } });
  }

  async markEmailVerified(id: UserId): Promise<void> {
    await this.db
      .collection<UserDoc>("users")
      .updateOne({ _id: id }, { $set: { emailVerified: true } });
  }
}

export async function ensureUserIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndexes([{ key: { email: 1 }, unique: true }]);
}
