import { ArrowRight, BookOpen, Presentation, Timer } from "lucide-react";
import Link from "next/link";
import { PractisedCount } from "@/components/practised-count";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSets } from "@/lib/content";
import { allQuestionKeys } from "@/lib/topic-keys";

export default async function HomePage() {
  const sets = await getSets();
  const topics = sets.flatMap((s) => s.topics);
  const keys = topics.flatMap(allQuestionKeys);

  const modes = [
    {
      href: "/sets",
      icon: BookOpen,
      title: "Practise questions",
      text: `${topics.length} official topics from ${sets.length} exam ${sets.length === 1 ? "set" : "sets"}, with suggested answers you can listen to sentence by sentence.`,
    },
    {
      href: "/mock-exam",
      icon: Timer,
      title: "Mock exam (delprøve 2)",
      text: "Draw a topic, look at the pictures for 10 seconds and answer the examiner's questions for 4½ minutes.",
    },
    {
      href: "/delproeve-1",
      icon: Presentation,
      title: "Presentation trainer (delprøve 1)",
      text: "Time your 2-minute presentation, keep your outline, and prepare for the follow-up questions.",
    },
  ] as const;

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">
          Prøve i Dansk 3 — <span lang="da">mundtlig kommunikation</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          15 minutes: a prepared presentation with follow-up questions (delprøve
          1), then questions about a topic you draw at random (delprøve 2).
          Practise both here, out loud.
        </p>
        <p className="text-sm">
          Practised: <PractisedCount keys={keys} />
        </p>
      </section>

      <section
        className="grid gap-4 md:grid-cols-3"
        aria-label="Practice modes"
      >
        {modes.map(({ href, icon: Icon, title, text }) => (
          <Card key={href}>
            <CardHeader>
              <Icon aria-hidden className="size-6 text-primary" />
              <CardTitle className="text-lg">
                <h2>{title}</h2>
              </CardTitle>
              <CardDescription>{text}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href={href}
                className={buttonVariants({ variant: "outline" })}
              >
                Open<span className="sr-only"> {title}</span>
                <ArrowRight aria-hidden />
              </Link>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-2 rounded-xl bg-muted p-5">
        <h2 className="font-semibold">Exam format in short</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            Delprøve 1: your topic (given 5 weekdays before) — about 2 minutes
            presenting, about 2½ minutes of questions.
          </li>
          <li>
            Delprøve 2: draw 1 of 3 topics, about 10 seconds with two pictures,
            about 4½ minutes of questions.
          </li>
          <li>
            One grade for the oral exam; it counts double in the PD3 average.
          </li>
        </ul>
      </section>
    </div>
  );
}
