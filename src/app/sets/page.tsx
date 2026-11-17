import type { Metadata } from "next";
import Link from "next/link";
import { PractisedCount } from "@/components/practised-count";
import { Badge } from "@/components/ui/badge";
import { getSets } from "@/lib/content";
import { allQuestionKeys } from "@/lib/topic-keys";

export const metadata: Metadata = { title: "Questions" };

export default async function SetsPage() {
  const sets = await getSets();

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Past exam questions
        </h1>
        <p className="text-muted-foreground">
          Official delprøve 2 topics. Exam material from November–December 2024
          onward is confidential, so the newest public set is May–June 2024.
        </p>
      </div>

      {sets.map((set) => (
        <section
          key={set.id}
          className="space-y-3"
          aria-labelledby={`set-${set.id}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`set-${set.id}`} className="text-xl font-semibold">
              <Link href={`/sets/${set.id}`} className="hover:underline">
                {set.label}
              </Link>
            </h2>
            <Badge variant="outline">
              {set.format === "current" ? "Current format" : "Older format"}
            </Badge>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {set.topics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/sets/${set.id}/${topic.id}`}
                  className="block h-full rounded-xl border p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="text-xs text-muted-foreground">
                    Emne {topic.letter}
                  </span>
                  <span lang="da" className="block font-medium">
                    {topic.title.da}
                  </span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {topic.answerCount}/{topic.questionCount} answers ·{" "}
                    <PractisedCount keys={allQuestionKeys(topic)} /> practised
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
