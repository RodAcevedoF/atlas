import { expect, test } from "bun:test";
import { InquiryStreamCapacity } from "./stream-capacity.ts";

for (const scenario of [
  { name: "one owner cannot take all connections", maximum: 3, perOwner: 1, secondOwner: "owner" },
  {
    name: "all owners share the process connection limit",
    maximum: 1,
    perOwner: 3,
    secondOwner: "another",
  },
]) {
  test(scenario.name, async () => {
    const capacity = new InquiryStreamCapacity(scenario.maximum, scenario.perOwner);
    const held = Promise.withResolvers<void>();
    const first = capacity.run("owner", () => held.promise);

    try {
      await expect(
        capacity.run(scenario.secondOwner, () => Promise.resolve("opened")),
      ).rejects.toMatchObject({ statusCode: 429 });
    } finally {
      held.resolve();
      await first;
    }

    expect(await capacity.run(scenario.secondOwner, () => Promise.resolve("reconnected"))).toBe(
      "reconnected",
    );
  });
}

test("a failed stream releases its owner's connection slot", async () => {
  const capacity = new InquiryStreamCapacity(1, 1);

  await expect(
    capacity.run("owner", () => Promise.reject(new Error("subscription failed"))),
  ).rejects.toThrow("subscription failed");

  expect(await capacity.run("owner", () => Promise.resolve("reconnected"))).toBe("reconnected");
});
