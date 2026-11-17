"use client";

import { Square, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSpeechPlayer } from "@/hooks/use-speech-player";
import type { SpeechItem } from "@/lib/content-view";

/** Plays what the examiner says (one or more lines) in the examiner's voice. */
export function ListenButton({
  items,
  label = "Listen",
}: {
  items: SpeechItem[];
  label?: string;
}) {
  const { state, play, stop } = useSpeechPlayer(items);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => (state.playing ? stop() : play())}
    >
      {state.playing ? <Square aria-hidden /> : <Volume2 aria-hidden />}
      {state.playing ? "Stop" : label}
    </Button>
  );
}
