import type { TopicView } from "./content-view";

/** Progress keys of every question in a topic. */
export function allQuestionKeys(topic: TopicView): string[] {
  return [
    ...topic.firstQuestion.flatMap((o) => [
      o.question.key,
      ...o.followUps.map((q) => q.key),
    ]),
    topic.secondQuestion.question.key,
    ...topic.secondQuestion.followUps.map((q) => q.key),
  ];
}
