"use client";

import { Play, Repeat, Square } from "lucide-react";
import { EnglishText } from "@/components/english-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSpeechPlayer } from "@/hooks/use-speech-player";
import type { AnswerView } from "@/lib/content-view";
import {
  type PlaybackRate,
  playbackRateStore,
  useLocalStore,
} from "@/lib/local-store";
import { cn } from "@/lib/utils";

/**
 * A model answer with sentence-by-sentence playback for shadowing:
 * play all, change speed, click a sentence to hear only that sentence, repeat the last one.
 */
export function AnswerPlayer({ answer }: { answer: AnswerView }) {
  const rate = useLocalStore(playbackRateStore);
  const { state, play, stop } = useSpeechPlayer(answer.sentences, rate);
  const missingAudio = answer.sentences.some((s) => !s.src);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          onClick={() => (state.playing ? stop() : play())}
        >
          {state.playing ? <Square aria-hidden /> : <Play aria-hidden />}
          {state.playing ? "Stop" : "Play answer"}
        </Button>
        <fieldset className="flex items-center gap-1">
          <legend className="sr-only">Playback speed</legend>
          {([0.75, 1] as PlaybackRate[]).map((r) => (
            <Button
              key={r}
              type="button"
              size="sm"
              variant={rate === r ? "secondary" : "ghost"}
              aria-pressed={rate === r}
              onClick={() => playbackRateStore.set(r)}
            >
              {r === 1 ? "1×" : "0.75×"}
            </Button>
          ))}
        </fieldset>
        {/* Always rendered (not only while playing), so it never disappears under keyboard focus. */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={state.last === null}
          onClick={() => play(state.last ?? 0, { single: true })}
        >
          <Repeat aria-hidden />
          Repeat last sentence
        </Button>
        <Badge variant="outline" className="ml-auto">
          {answer.status === "reviewed"
            ? "Suggested answer · reviewed"
            : "Suggested answer · draft"}
        </Badge>
      </div>

      <p lang="da" className="leading-relaxed">
        {answer.sentences.map((sentence, i) => (
          <span key={sentence.text}>
            <button
              type="button"
              onClick={() => play(i, { single: true })}
              aria-current={state.index === i ? "true" : undefined}
              title="Play this sentence"
              className={cn(
                "rounded-sm px-0.5 text-left transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-ring",
                // Underline as well as colour, so the cue survives forced colours (WCAG 1.4.1).
                state.index === i &&
                  "bg-yellow-200 text-black underline decoration-yellow-700 decoration-2 underline-offset-4 forced-colors:outline-2 forced-colors:outline dark:bg-yellow-300",
              )}
            >
              {sentence.text}
            </button>{" "}
          </span>
        ))}
      </p>

      <EnglishText>{answer.en}</EnglishText>
      <p className="text-xs text-muted-foreground">
        AI-written suggestion, not an official answer. Click a sentence to hear
        it alone.
        {missingAudio &&
          " Using your browser's Danish voice until the audio files are generated."}
      </p>
    </div>
  );
}
