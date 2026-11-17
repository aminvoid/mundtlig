"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Records the microphone in the browser (MediaRecorder). The recording never leaves the device:
 * it is only kept as an object URL for playback.
 *
 * Microphones only work in a secure context: http://localhost or https. To test on a phone,
 * run `bun run dev:https` and open the https address.
 */

export type RecorderStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "stopped"
  | "error";

export function useRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const releaseStream = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }, []);

  /** Starts recording; resolves to `true` when recording actually started. */
  const start = useCallback(async (): Promise<boolean> => {
    if (
      !window.isSecureContext ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setStatus("error");
      setError(
        "Recording needs a supported browser and a secure page (localhost or https).",
      );
      return false;
    }
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks, {
          type: recorder.mimeType || "audio/webm",
        });
        setUrl((previous) => {
          if (previous) URL.revokeObjectURL(previous);
          return URL.createObjectURL(blob);
        });
        setStatus("stopped");
        releaseStream();
      };
      recorderRef.current = recorder;
      recorder.start();
      setStatus("recording");
      return true;
    } catch (err) {
      releaseStream();
      setStatus("error");
      setError(
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access was blocked. Allow it in the browser's site settings."
          : "Could not start recording.",
      );
      return false;
    }
  }, [releaseStream]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    else releaseStream();
  }, [releaseStream]);

  const clear = useCallback(() => {
    setUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return null;
    });
    setStatus("idle");
  }, []);

  // Stop recording if the page is hidden or unmounted.
  useLayoutEffect(() => () => stop(), [stop]);

  return { status, url, error, start, stop, clear };
}
