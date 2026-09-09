import { expect, test } from "bun:test";
import {
  MemoryPasswordLoginState,
  MemoryPasswords,
  heldPasswordVerification,
} from "../testing/password-login.ts";
import { InvalidCredentialsError } from "./auth.ts";
import { GuardedPasswordProvider } from "./guarded-password-provider.ts";

function setup() {
  let time = 1_000_000;
  const states = new MemoryPasswordLoginState(() => time);
  const passwords = new MemoryPasswords();
  const guard = new GuardedPasswordProvider(passwords, states, () => time);
  return {
    states,
    passwords,
    guard,
    advance: (milliseconds: number) => {
      time += milliseconds;
    },
    login: (password = "correct", email = "owner@atlas.test") =>
      guard.authenticate({ email, password }),
  };
}

async function fail(attempt: () => Promise<unknown>, count: number) {
  for (let index = 0; index < count; index++)
    await expect(attempt()).rejects.toThrow(InvalidCredentialsError);
}

for (const account of ["owner@atlas.test", "unknown@atlas.test"]) {
  test(`five failures lock ${account}, blocked attempts do not extend recovery`, async () => {
    const subject = setup();
    await fail(() => subject.login("wrong", account), 5);
    subject.passwords.credentials.set(account, "correct");

    await expect(subject.login("correct", account)).rejects.toThrow("Invalid email or password");
    subject.advance(299_999);
    await expect(subject.login("correct", account)).rejects.toThrow(InvalidCredentialsError);
    subject.advance(1);

    expect((await subject.login("correct", account)).email).toBe(account);
  });
}

test("email case and surrounding whitespace share the lock", async () => {
  const subject = setup();
  await fail(() => subject.login("wrong", " OWNER@Atlas.Test "), 5);

  await expect(subject.login()).rejects.toThrow(InvalidCredentialsError);
});

test("another account can authenticate while the first is locked", async () => {
  const subject = setup();
  subject.passwords.credentials.set("other@atlas.test", "correct");
  await fail(() => subject.login("wrong"), 5);

  expect((await subject.login("correct", "other@atlas.test")).email).toBe("other@atlas.test");
});

test("success below the threshold clears earlier failures", async () => {
  const subject = setup();
  await fail(() => subject.login("wrong"), 4);
  await subject.login();
  await fail(() => subject.login("wrong"), 4);

  expect((await subject.login()).email).toBe("owner@atlas.test");
});

test("failures expire fifteen minutes after the first attempt", async () => {
  const subject = setup();
  await fail(() => subject.login("wrong"), 3);
  subject.advance(899_999);
  await fail(() => subject.login("wrong"), 1);
  subject.advance(1);
  await fail(() => subject.login("wrong"), 1);

  expect((await subject.login()).email).toBe("owner@atlas.test");
});

test("concurrent requests cannot bypass the fifth failure", async () => {
  const subject = setup();
  await fail(() => subject.login("wrong"), 4);

  const results = await Promise.allSettled([
    subject.login("wrong"),
    ...Array.from({ length: 20 }, () => subject.login()),
  ]);

  expect(results.every((result) => result.status === "rejected")).toBe(true);
  await expect(subject.login()).rejects.toThrow(InvalidCredentialsError);
});

test("abandoned verification recovers after thirty seconds and stale success cannot clear a new lock", async () => {
  const subject = setup();
  await fail(() => subject.login("wrong"), 4);
  const release = heldPasswordVerification(subject.passwords);
  const stale = subject.login();
  await Promise.resolve();
  await Promise.resolve();
  subject.advance(30_000);
  subject.passwords.pending = null;
  await fail(() => subject.login("wrong"), 1);

  release();

  await expect(stale).rejects.toThrow(InvalidCredentialsError);
  await expect(subject.login()).rejects.toThrow(InvalidCredentialsError);
});

test("late wrong password cannot overwrite a newer successful reset", async () => {
  const subject = setup();
  await fail(() => subject.login("wrong"), 4);
  const release = heldPasswordVerification(subject.passwords);
  const stale = subject.login("wrong");
  await Promise.resolve();
  await Promise.resolve();
  subject.advance(30_000);
  subject.passwords.pending = null;
  await subject.login();

  release();
  await expect(stale).rejects.toThrow(InvalidCredentialsError);

  expect((await subject.login()).email).toBe("owner@atlas.test");
});

test("password store errors do not count as credential failures", async () => {
  const subject = setup();
  await fail(() => subject.login("wrong"), 4);
  subject.passwords.available = false;

  await expect(subject.login()).rejects.toThrow("Password store unavailable");
  subject.passwords.available = true;

  expect((await subject.login()).email).toBe("owner@atlas.test");
});

test("unavailable login state fails closed", async () => {
  const subject = setup();
  subject.states.available = false;

  await expect(subject.login()).rejects.toThrow("Login state unavailable");
});

test("state outage after password verification still fails closed", async () => {
  const subject = setup();
  const release = heldPasswordVerification(subject.passwords);
  const result = subject.login();
  await Promise.resolve();
  await Promise.resolve();
  subject.states.available = false;

  release();

  await expect(result).rejects.toThrow("Login state unavailable");
});

test("a verification that outlives its lease cannot authenticate even without a competing request", async () => {
  const subject = setup();
  const release = heldPasswordVerification(subject.passwords);
  const result = subject.login();
  await Promise.resolve();
  await Promise.resolve();
  subject.advance(30_000);

  release();

  await expect(result).rejects.toThrow(InvalidCredentialsError);
  expect((await subject.login()).email).toBe("owner@atlas.test");
});
