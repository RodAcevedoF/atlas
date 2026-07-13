import type { UserStorePort } from "@atlas/application";
import type { User, UserId, UserProfile } from "@atlas/domain";
import { makeUserId } from "@atlas/domain";
import type { Db } from "mongodb";

interface UserDoc {
  _id: string;
  email: string;
  passwordHash: string;
  profile: UserProfile;
  createdAt: Date;
}

function docToUser(doc: UserDoc): User {
  return {
    id: makeUserId(doc._id),
    email: doc.email,
    passwordHash: doc.passwordHash,
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
      passwordHash: user.passwordHash,
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
}

export async function ensureUserIndexes(db: Db): Promise<void> {
  await db.collection("users").createIndexes([{ key: { email: 1 }, unique: true }]);
}
