"use client";

import * as React from "react";

/** Talk mode lifecycle — listen → transcribe → confirm in composer (no auto-send). */
export type TalkModeState = "idle" | "listening" | "transcribing" | "error";

export interface UseTalkModeOptions {
  /** BCP-47 language tag for recognition. Default `en-US`. */
  lang?: string;
  /** When true, recognition restarts after pauses until stopListening. Default true. */
  continuous?: boolean;
  /** When true, interim hypotheses update `transcript` while listening. Default true. */
  interimResults?: boolean;
  /**
   * Called with the finalized transcript after listening ends.
   * Parent should merge into composer text — hook does not send messages.
   */
  onTranscript?: (text: string) => void;
}

export interface UseTalkModeResult {
  state: TalkModeState;
  transcript: string;
  error: string | null;
  isSupported: boolean;
  startListening: () => void;
  stopListening: () => void;
  clearTranscript: () => void;
}

/** Minimal Web Speech API shapes — not all browsers ship DOM lib definitions. */
export interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

export interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}

export interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultListLike;
}

export interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type WindowWithSpeech = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

/** Resolve browser SpeechRecognition constructor, if any. Exported for unit tests. */
export function getSpeechRecognitionConstructor(
  win: WindowWithSpeech | undefined = typeof window !== "undefined" ? (window as WindowWithSpeech) : undefined,
): SpeechRecognitionConstructor | null {
  if (!win) return null;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

/** Flatten Web Speech result list into one transcript string. Exported for unit tests. */
export function collectTranscriptFromResults(
  results: SpeechRecognitionResultListLike,
  { finalOnly = false }: { finalOnly?: boolean } = {},
): string {
  const parts: string[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (!result) continue;
    if (finalOnly && !result.isFinal) continue;
    const alt = result[0];
    const text = alt?.transcript?.trim();
    if (text) parts.push(text);
  }
  return parts.join(" ").trim();
}

export function useTalkMode(options: UseTalkModeOptions = {}): UseTalkModeResult {
  const {
    lang = "en-US",
    continuous = true,
    interimResults = true,
    onTranscript,
  } = options;

  const onTranscriptRef = React.useRef(onTranscript);
  React.useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  const [state, setState] = React.useState<TalkModeState>("idle");
  const [transcript, setTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const stopRequestedRef = React.useRef(false);
  const finalTranscriptRef = React.useRef("");
  const interimTranscriptRef = React.useRef("");

  const isSupported = React.useMemo(
    () => getSpeechRecognitionConstructor() !== null,
    [],
  );

  const teardownRecognition = React.useCallback(() => {
    recognitionRef.current = null;
  }, []);

  React.useEffect(() => {
    return () => {
      const active = recognitionRef.current;
      if (active) {
        try {
          active.abort();
        } catch {
          // ignore — recognition may already be stopped
        }
      }
      teardownRecognition();
    };
  }, [teardownRecognition]);

  const clearTranscript = React.useCallback(() => {
    setTranscript("");
    setError(null);
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    if (state === "error") setState("idle");
  }, [state]);

  const stopListening = React.useCallback(() => {
    stopRequestedRef.current = true;
    const active = recognitionRef.current;
    if (!active) {
      if (state === "listening") setState("idle");
      return;
    }
    setState("transcribing");
    try {
      active.stop();
    } catch {
      setState("idle");
      teardownRecognition();
    }
  }, [state, teardownRecognition]);

  const startListening = React.useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) {
      setError("Speech recognition is not supported in this browser.");
      setState("error");
      return;
    }

    if (recognitionRef.current) return;

    stopRequestedRef.current = false;
    finalTranscriptRef.current = "";
    interimTranscriptRef.current = "";
    setError(null);
    setTranscript("");
    setState("listening");

    const recognition = new Ctor();
    recognitionRef.current = recognition;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.lang = lang;

    recognition.onresult = (event) => {
      const finalized = collectTranscriptFromResults(event.results, { finalOnly: true });
      if (finalized) finalTranscriptRef.current = finalized;

      const display = collectTranscriptFromResults(event.results, { finalOnly: false });
      if (display) {
        interimTranscriptRef.current = display;
        setTranscript(display);
      }
    };

    recognition.onerror = (event) => {
      const code = event.error ?? "unknown";
      if (code === "aborted" || code === "no-speech") {
        if (stopRequestedRef.current) return;
        setError(code === "no-speech" ? "No speech detected. Try again." : null);
        setState(code === "no-speech" ? "error" : "idle");
        teardownRecognition();
        return;
      }
      setError(event.message ?? `Speech recognition error (${code}).`);
      setState("error");
      teardownRecognition();
    };

    recognition.onend = () => {
      const text = (finalTranscriptRef.current || interimTranscriptRef.current).trim();
      teardownRecognition();

      if (text) {
        setTranscript(text);
        onTranscriptRef.current?.(text);
      }

      setState("idle");
    };

    try {
      recognition.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start speech recognition.");
      setState("error");
      teardownRecognition();
    }
  }, [continuous, interimResults, lang, teardownRecognition]);

  return {
    state,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    clearTranscript,
  };
}
