"use client";

import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { AnswerPlayer } from "@/components/answer-player";
import { EnglishText } from "@/components/english-toggle";
import { ListenButton } from "@/components/listen-button";
import { Button } from "@/components/ui/button";
import type { QuestionView, SpeechItem } from "@/lib/content-view";
import {
  practisedStore,
  togglePractised,
  useLocalStore,
} from "@/lib/local-store";
import { cn } from "@/lib/utils";

type Props = {
  question: QuestionView;
  /** Short label such as "Required question" or "Follow-up". */
  kind: string;
  /** Lines the examiner says before the question (e.g. "Situation A viser …"). */
  lead?: SpeechItem[];
  /** Heading level of the question text, so screen readers can jump between questions. */
  headingLevel?: 3 | 4;
};

export function QuestionCard({
  question,
  kind,
  lead = [],
  headingLevel = 3,
}: Props) {
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const [open, setOpen] = useState(false);
  const answerId = useId();
  const practised = useLocalStore(practisedStore).includes(question.key);

  return (
    <article
      className={cn(
        "space-y-3 rounded-xl border p-4",
        practised && "border-green-600/40 bg-green-50/40 dark:bg-green-950/20",
      )}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {kind}
      </p>
      <Heading lang="da" className="text-lg leading-snug font-medium">
        {question.da}
      </Heading>
      <EnglishText>{question.en}</EnglishText>

      <div className="flex flex-wrap items-center gap-2">
        <ListenButton
          items={[...lead, question.speech]}
          label="Listen to examiner"
        />
        {question.answer && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            aria-expanded={open}
            aria-controls={answerId}
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown
              aria-hidden
              className={cn("transition-transform", open && "rotate-180")}
            />
            {open ? "Hide answer" : "Show suggested answer"}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant={practised ? "secondary" : "ghost"}
          aria-pressed={practised}
          onClick={() => togglePractised(question.key)}
          className="ml-auto"
        >
          <Check aria-hidden className={cn(!practised && "opacity-40")} />
          Practised
        </Button>
      </div>

      {question.answer && (
        <div id={answerId} hidden={!open}>
          {open && <AnswerPlayer answer={question.answer} />}
        </div>
      )}
      {!question.answer && (
        <p className="text-sm text-muted-foreground">
          No suggested answer yet.
        </p>
      )}
    </article>
  );
}
