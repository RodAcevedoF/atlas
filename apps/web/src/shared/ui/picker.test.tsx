import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Picker } from "./picker.tsx";

afterEach(cleanup);

function renderPicker() {
  render(
    <>
      <Picker trigger="most sexist violence" label="Pick an inquiry" title="Recent inquiries">
        {(close) => (
          <button type="button" onClick={close}>
            a run
          </button>
        )}
      </Picker>
      <button type="button">elsewhere</button>
    </>,
  );
}

const trigger = () => screen.getByRole("button", { name: "Pick an inquiry" });
const isOpen = () => trigger().getAttribute("aria-expanded") === "true";

function open() {
  trigger().focus();
  fireEvent.click(trigger());
}

describe("Picker", () => {
  test("opening reveals the panel and says so to assistive tech", () => {
    renderPicker();

    open();

    expect(isOpen()).toBe(true);
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(screen.getByRole("button", { name: "a run" })).toBeDefined();
  });

  test("Escape closes the panel and hands focus back to the trigger", () => {
    renderPicker();
    open();

    fireEvent.keyDown(trigger(), { key: "Escape" });

    expect(isOpen()).toBe(false);
    expect(screen.queryByRole("button", { name: "a run" })).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  test("Escape still closes after a click on the panel's own chrome dropped focus to the body", () => {
    renderPicker();
    open();
    trigger().blur();

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(isOpen()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  test("a closed picker stops answering Escape rather than stealing focus back", () => {
    renderPicker();
    open();
    fireEvent.keyDown(trigger(), { key: "Escape" });
    const elsewhere = screen.getByRole("button", { name: "elsewhere" });
    elsewhere.focus();

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(document.activeElement).toBe(elsewhere);
  });
});
