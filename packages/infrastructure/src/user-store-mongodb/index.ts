import type { UserPage, UserPageInput, UserStorePort } from "@atlas/application";
import { EmailInUseError, InvalidAdminUserCursorError } from "@atlas/application";
import type {
  GrantableRole,
  User,
  UserId,
  UserIdentity,
  UserProfile,
  UserRole,
} from "@atlas/domain";
import { makeUserId } from "@atlas/domain";
import { type Db, type Filter, MongoServerError } from "mongodb";

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

interface UserCursor {
  createdAt: string;
  id: string;
}

function encodeCursor(doc: UserDoc): string {
  return Buffer.from(
    JSON.stringify({ createdAt: doc.createdAt.toISOString(), id: doc._id }),
  ).toString("base64url");
}

function decodeCursor(cursor: string): UserCursor {
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as Partial<UserCursor>;
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string") throw new Error();
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) throw new Error();
    return { createdAt: createdAt.toISOString(), id: parsed.id };
  } catch {
    throw new InvalidAdminUserCursorError();
  }
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
    try {
      await this.db.collection<UserDoc>("users").insertOne(doc);
    } catch (cause) {
      if (cause instanceof MongoServerError && cause.code === 11000) {
        throw new EmailInUseError(user.email);
      }
      throw cause;
    }
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const doc = await this.db.collection<UserDoc>("users").findOne({ email });
    return doc ? docToUser(doc) : null;
  }

  async findUserByIdentity(
    identity: Pick<UserIdentity, "provider" | "providerUserId">,
  ): Promise<User | null> {
    const doc = await this.db.collection<UserDoc>("users").findOne({
      identities: {
        $elemMatch: {
          provider: identity.provider,
          providerUserId: identity.providerUserId,
        },
      },
    });
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

  async updateEmail(id: UserId, email: string): Promise<void> {
    try {
      await this.db.collection<UserDoc>("users").updateOne({ _id: id }, [
        {
          $set: {
            email,
            identities: {
              $map: {
                input: { $ifNull: ["$identities", []] },
                as: "identity",
                in: {
                  $cond: [
                    { $eq: ["$$identity.provider", "password"] },
                    { $mergeObjects: ["$$identity", { email }] },
                    "$$identity",
                  ],
                },
              },
            },
          },
        },
      ]);
    } catch (cause) {
      if (cause instanceof MongoServerError && cause.code === 11000) {
        throw new EmailInUseError(email);
      }
      throw cause;
    }
  }

  async setPasswordIdentity(id: UserId, identity: UserIdentity): Promise<void> {
    const updated = await this.db
      .collection<UserDoc>("users")
      .updateOne(
        { _id: id, "identities.provider": "password" },
        { $set: { "identities.$": identity } },
      );
    if (updated.matchedCount === 1) return;
    await this.db
      .collection<UserDoc>("users")
      .updateOne({ _id: id }, { $push: { identities: identity } });
  }

  async deleteUser(id: UserId): Promise<void> {
    await this.db.collection<UserDoc>("users").deleteOne({ _id: id });
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

  async countUsersByRole(): Promise<Partial<Record<UserRole, number>>> {
    const rows = await this.db
      .collection<UserDoc>("users")
      .aggregate<{ _id: UserRole; count: number }>([
        { $group: { _id: { $ifNull: ["$role", "user"] }, count: { $sum: 1 } } },
      ])
      .toArray();
    const counts: Partial<Record<UserRole, number>> = {};
    for (const row of rows) {
      counts[row._id] = row.count;
    }
    return counts;
  }

  async listUsers(input: UserPageInput): Promise<UserPage> {
    const filter: Filter<UserDoc> = {};
    if (input.cursor) {
      const cursor = decodeCursor(input.cursor);
      const createdAt = new Date(cursor.createdAt);
      filter.$or = [{ createdAt: { $lt: createdAt } }, { createdAt, _id: { $lt: cursor.id } }];
    }
    const docs = await this.db
      .collection<UserDoc>("users")
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(input.limit + 1)
      .toArray();
    const page = docs.slice(0, input.limit);
    const last = page.at(-1);
    return {
      users: page.map(docToUser),
      nextCursor: docs.length > input.limit && last ? encodeCursor(last) : null,
    };
  }
}

export async function ensureUserIndexes(db: Db): Promise<void> {
  await db
    .collection("users")
    .createIndexes([
      { key: { email: 1 }, unique: true },
      { key: { "identities.provider": 1, "identities.providerUserId": 1 } },
    ]);
}
