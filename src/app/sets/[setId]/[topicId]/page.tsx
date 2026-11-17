import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnglishText } from "@/components/english-toggle";
import { ListenButton } from "@/components/listen-button";
import { PractisedCount } from "@/components/practised-count";
import { QuestionCard } from "@/components/question-card";
import { Badge } from "@/components/ui/badge";
import { getSets, getTopic } from "@/lib/content";
import { allQuestionKeys } from "@/lib/topic-keys";

export async function generateStaticParams() {
  const sets = await getSets();
  return sets.flatMap((set) =>
    set.topics.map((topic) => ({ setId: set.id, topicId: topic.id })),
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/sets/[setId]/[topicId]">): Promise<Metadata> {
  const { setId, topicId } = await params;
  const topic = await getTopic(setId, topicId);
  return {
    title: topic ? `${topic.title.da} (${topic.setLabel})` : "Not found",
  };
}

export default async function TopicPage({
  params,
}: PageProps<"/sets/[setId]/[topicId]">) {
  const { setId, topicId } = await params;
  const topic = await getTopic(setId, topicId);
  if (!topic) notFound();

  return (
    <div className="space-y-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/sets" className="hover:underline">
          Questions
        </Link>{" "}
        /{" "}
        <Link href={`/sets/${topic.setId}`} className="hover:underline">
          {topic.setLabel}
        </Link>
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" lang="da">
            Emne {topic.letter}
          </Badge>
          <span className="text-sm text-muted-foreground">
            <PractisedCount keys={allQuestionKeys(topic)} /> practised
          </span>
        </div>
        <h1 lang="da" className="text-3xl font-bold tracking-tight">
          {topic.title.da}
        </h1>
        <EnglishText>{topic.title.en}</EnglishText>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <aside className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          {topic.picture ? (
            <Image
              src={topic.picture.file}
              width={topic.picture.width}
              height={topic.picture.height}
              alt={topic.picture.alt}
              lang="da"
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="h-auto w-full rounded-lg border bg-white"
              priority
            />
          ) : (
            <p className="rounded-lg border p-4 text-sm text-muted-foreground">
              No picture sheet for this topic.
            </p>
          )}
          <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
            <p lang="da">{topic.examinerIntro.da}</p>
            <ListenButton
              items={[topic.examinerIntro.speech]}
              label="Listen to the intro"
            />
          </div>
        </aside>

        <div className="space-y-10">
          <section className="space-y-6" aria-labelledby="first-q">
            <div>
              <h2 id="first-q" className="text-xl font-semibold">
                First required question
              </h2>
              <p className="text-sm text-muted-foreground">
                The examiner picks one of the two situations, introduces it and
                asks about it. Practise both.
              </p>
            </div>
            {topic.firstQuestion.map((option) => {
              const caption = topic.situations?.find(
                (s) => s.label === option.label,
              )?.caption;
              return (
                <div key={option.label} className="space-y-3">
                  <h3 className="font-semibold">
                    Situation {option.label}
                    {caption && (
                      <>
                        : <span lang="da">{caption.da}</span>
                      </>
                    )}
                  </h3>
                  {option.intro && (
                    <p lang="da" className="text-muted-foreground italic">
                      {option.intro.da}
                    </p>
                  )}
                  <QuestionCard
                    question={option.question}
                    kind="Required question"
                    headingLevel={4}
                    lead={option.intro ? [option.intro.speech] : []}
                  />
                  {option.followUps.map((q) => (
                    <QuestionCard
                      key={q.key}
                      question={q}
                      kind="Suggested follow-up"
                      headingLevel={4}
                    />
                  ))}
                </div>
              );
            })}
          </section>

          <section className="space-y-4" aria-labelledby="second-q">
            <div>
              <h2 id="second-q" className="text-xl font-semibold">
                Second required question
              </h2>
              <p className="text-sm text-muted-foreground">
                A more general question about the topic, usually advantages and
                disadvantages.
              </p>
            </div>
            <QuestionCard
              question={topic.secondQuestion.question}
              kind="Required question"
              lead={[topic.transition.speech]}
            />
            {topic.secondQuestion.followUps.map((q) => (
              <QuestionCard
                key={q.key}
                question={q}
                kind="Suggested follow-up"
              />
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
