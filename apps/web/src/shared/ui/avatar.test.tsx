import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Avatar } from "./avatar.tsx";

afterEach(cleanup);

test("a missing profile image falls back to the user's initials", () => {
  render(<Avatar name="jane.doe@example.com" isActive={false} />);

  expect(screen.getByText("jd")).toBeDefined();
});

test("an image that cannot load also falls back instead of leaving a broken avatar", () => {
  const { container } = render(
    <Avatar name="jane.doe@example.com" isActive={false} imageUrl="/api/profile/image" />,
  );
  const image = container.querySelector("img");
  if (!image) throw new Error("profile image was not rendered");

  fireEvent.error(image);

  expect(screen.getByText("jd")).toBeDefined();
  expect(container.querySelector("img")).toBeNull();
});
