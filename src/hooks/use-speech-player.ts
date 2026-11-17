"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { SpeechItem } from "@/lib/content-view";

/**
 * Plays a list of sentences one after another and reports which one is playing.
 *
 * Each item uses its generated MP3 (`src`) when available and otherwise falls back to the
 * browser's Danish speech synthesis, so the app works before audio has been generated.
 * Only one player plays at a time across the page, and playback stops when the component is
 * hidden (Next.js keeps hidden pages mounted with <Activity>, which does not stop <audio>).
 */

export type SpeechPlayerState = {
  playing: boolean;
  /** Sentence playing now. */
  index: number | null;
  /** Last sentence that started playing (kept after playback ends, for "repeat"). */
  last: number | null;
};

let stopActivePlayer: (() => void) | null = null;

function danishVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return (
    voices.find((v) => v.lang === "da-DK") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("da"))
  );
}

export type PlayOptions = {
  /** Play only the sentence at `start`. */
  single?: boolean;
  /** Called when playback reaches the end (not when it is stopped). */
  onEnd?: () => void;
  /** Play these items instead of the hook's list (e.g. the examiner's lines for the current step). */
  items?: SpeechItem[];
};

export function useSpeechPlayer(items: SpeechItem[] = [], rate = 1) {
  const [state, setState] = useState<SpeechPlayerState>({
    playing: false,
    index: null,
    last: null,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const tokenRef = useRef(0);
  const itemsRef = useRef(items);
  const overrideRef = useRef<SpeechItem[] | null>(null);
  const rateRef = useRef(rate);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    rateRef.current = rate;
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }, [rate]);

  const stop = useCallback(() => {
    tokenRef.current++;
    audioRef.current?.pause();
    if (typeof window !== "undefined" && "speechSynthesis" in window)
      window.speechSynthesis.cancel();
    setState((prev) => ({ playing: false, index: null, last: prev.last }));
  }, []);

  const play = useCallback(
    (
      start = 0,
      { single = false, onEnd, items: override }: PlayOptions = {},
    ) => {
      if (stopActivePlayer && stopActivePlayer !== stop) stopActivePlayer();
      stop();
      overrideRef.current = override ?? null;
      stopActivePlayer = stop;
      const token = tokenRef.current;
      const isCurrent = () => token === tokenRef.current;

      const finish = () => {
        if (!isCurrent()) return;
        setState((prev) => ({ playing: false, index: null, last: prev.last }));
        if (stopActivePlayer === stop) stopActivePlayer = null;
        onEnd?.();
      };

      const speakFallback = (text: string, onDone: () => void) => {
        if (!("speechSynthesis" in window)) {
          onDone();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "da-DK";
        const voice = danishVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = rateRef.current;
        utterance.onend = () => isCurrent() && onDone();
        utterance.onerror = () => isCurrent() && onDone();
        window.speechSynthesis.speak(utterance);
      };

      const step = (i: number) => {
        const item = (overrideRef.current ?? itemsRef.current)[i];
        if (!isCurrent()) return;
        if (!item || (single && i !== start)) {
          finish();
          return;
        }
        setState({ playing: true, index: i, last: i });
        const next = () => isCurrent() && step(i + 1);

        if (!item.src) {
          speakFallback(item.text, next);
          return;
        }
        audioRef.current ??= new Audio();
        const audio = audioRef.current;
        audio.src = item.src;
        audio.playbackRate = rateRef.current;
        audio.onended = next;
        audio.onerror = () => isCurrent() && speakFallback(item.text, next);
        audio.play().catch(() => isCurrent() && speakFallback(item.text, next));
      };

      step(start);
    },
    [stop],
  );

  // Stop when the component unmounts or Next.js hides the page (Activity runs layout cleanups).
  useLayoutEffect(
    () => () => {
      if (stopActivePlayer === stop) stopActivePlayer = null;
      stop();
    },
    [stop],
  );

  return { state, play, stop };
}
