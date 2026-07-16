import { normalizeEmail } from "@atlas/application";
import { type User, emptyProfile, makeUserId } from "@atlas/domain";
import { BunPasswordHasher } from "@atlas/infra/password-bun";
import { createMongoClient } from "@atlas/infra/store-mongodb";
import { MongoUserStore, ensureUserIndexes } from "@atlas/infra/user-store-mongodb";

async function seedAdmin(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is required");
  const dbName = process.env.MONGODB_DB_NAME ?? "atlas";

  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required");
  }

  const client = createMongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    await ensureUserIndexes(db);
    const users = new MongoUserStore(db);
    const hasher = new BunPasswordHasher();

    const normalized = normalizeEmail(email);
    const existing = await users.findUserByEmail(normalized);
    if (existing) {
      console.log(`Admin ${normalized} already exists (${existing.id}); nothing to do.`);
      return;
    }

    const id = makeUserId(crypto.randomUUID());
    const user: User = {
      id,
      email: normalized,
      identities: [
        {
          provider: "password",
          providerUserId: id,
          email: normalized,
          secret: await hasher.hash(password),
        },
      ],
      profile: emptyProfile(),
      createdAt: new Date(),
    };
    await users.createUser(user);
    console.log(`Seeded admin ${normalized} (${id}).`);
  } finally {
    await client.close();
  }
}

seedAdmin().catch((error) => {
  console.error(error);
  process.exit(1);
});
