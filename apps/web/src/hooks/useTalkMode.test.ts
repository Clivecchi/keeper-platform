// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  collectTranscriptFromResults,
  getSpeechRecognitionConstructor,
  type SpeechRecognitionResultListLike,
} from "./useTalkMode";

function makeResults(
  entries: ReadonlyArray<{ text: string; isFinal: boolean }>,
): SpeechRecognitionResultListLike {
  const list = entries.map((entry) => {
    const result = {
      isFinal: entry.isFinal,
      length: 1,
      0: { transcript: entry.text },
    };
    return result;
  });
  return Object.assign(list, { length: list.length });
}

describe("getSpeechRecognitionConstructor", () => {
  it("returns SpeechRecognition when present", () => {
    class MockSpeechRecognition {}
    const win = { SpeechRecognition: MockSpeechRecognition } as unknown as Window;
    expect(getSpeechRecognitionConstructor(win)).toBe(MockSpeechRecognition);
  });

  it("falls back to webkitSpeechRecognition", () => {
    class MockWebkit {}
    const win = { webkitSpeechRecognition: MockWebkit } as unknown as Window;
    expect(getSpeechRecognitionConstructor(win)).toBe(MockWebkit);
  });

  it("returns null when neither constructor exists", () => {
    expect(getSpeechRecognitionConstructor({} as Window)).toBeNull();
    expect(getSpeechRecognitionConstructor(undefined)).toBeNull();
  });
});

describe("collectTranscriptFromResults", () => {
  it("joins all segments when finalOnly is false", () => {
    const results = makeResults([
      { text: "Hello", isFinal: true },
      { text: "world", isFinal: false },
    ]);
    expect(collectTranscriptFromResults(results)).toBe("Hello world");
  });

  it("includes only final segments when finalOnly is true", () => {
    const results = makeResults([
      { text: "Hello", isFinal: true },
      { text: "world", isFinal: false },
    ]);
    expect(collectTranscriptFromResults(results, { finalOnly: true })).toBe("Hello");
  });

  it("returns empty string for empty results", () => {
    expect(collectTranscriptFromResults({ length: 0 })).toBe("");
  });
});
