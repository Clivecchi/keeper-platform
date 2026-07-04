import { describe, expect, it } from "vitest";
import { shapeRecordDescription, shapeRecordTitle } from "./recordNaming.js";

describe("shapeRecordTitle", () => {
  it("uses quoted phrase when present", () => {
    expect(shapeRecordTitle('Creating "Where is Ceox?" with mood')).toBe("Where is Ceox?");
  });

  it("uses first sentence when short", () => {
    expect(shapeRecordTitle("Where is Ceox? A visual search.")).toBe("Where is Ceox?");
  });

  it("truncates long single-line prompts", () => {
    const long =
      "A cinematic domain cover for Chuck Livecchi with dark near-black background and sparse layout";
    const title = shapeRecordTitle(long);
    expect(title.length).toBeLessThanOrEqual(72);
    expect(title.endsWith("…")).toBe(true);
  });

  it("strips Generated prefix", () => {
    expect(shapeRecordTitle("Generated · Sunset over the lake")).toBe("Sunset over the lake");
  });
});

describe("shapeRecordDescription", () => {
  it("returns null when text equals title", () => {
    expect(shapeRecordDescription("Short title", "Short title")).toBeNull();
  });

  it("returns full text when longer than title", () => {
    const long = "Line one is short. " + "x".repeat(100);
    expect(shapeRecordDescription(long)?.length).toBeGreaterThan(72);
  });
});
