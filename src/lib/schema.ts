import { z } from "zod";

/**
 * Content schema for PD3 oral exam sets (mundtlig kommunikation, delprøve 2).
 *
 * One JSON file per exam term lives in `content/sets/<id>.json` and must match `ExamSetSchema`.
 * The JSON Schema in `content/schema.json` is generated from this file (`bun run content:schema`),
 * so editors can autocomplete and validate the content files.
 *
 * Audio is NOT stored in the content files: file names are derived from the text and voice
 * (see `src/lib/audio.ts`), so editing a sentence automatically marks its audio as missing.
 */

const nonEmpty = z.string().trim().min(1);

export const SlugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "lowercase letters, digits and single dashes",
  );

export const SetIdSchema = z
  .string()
  .regex(
    /^\d{4}-(s|v)$/,
    'year + term, e.g. "2024-s" (summer) or "2023-v" (winter)',
  );

/** A model answer, written sentence by sentence so the player can highlight and repeat sentences. */
export const AnswerSchema = z.object({
  sentences: z
    .array(nonEmpty)
    .min(1)
    .describe("Danish answer, one sentence per item"),
  en: nonEmpty.describe("English translation of the whole answer"),
  status: z
    .enum(["draft", "reviewed"])
    .default("draft")
    .describe("Set to 'reviewed' after the Danish reviewer has checked it"),
});

/** Something the examiner says: an intro line, a required question or a follow-up question. */
export const SpokenSchema = z.object({
  da: nonEmpty.describe("Exact Danish wording from the examiner booklet"),
  en: z.string().trim().optional().describe("English translation"),
});

export const QuestionSchema = z.object({
  id: SlugSchema.describe(
    "Stable id within the topic, e.g. 'q1-a', 'q1-a-f1', 'q2', 'q2-f1'",
  ),
  da: SpokenSchema.shape.da,
  en: SpokenSchema.shape.en,
  answer: AnswerSchema.optional(),
});

/**
 * First required question. In the current format (from May–June 2023) each option belongs to one
 * picture situation and has an intro line. In the legacy format the examiner chose question A or B
 * after the candidate had described both pictures, so `intro` is absent.
 */
export const FirstQuestionOptionSchema = z.object({
  label: z.enum(["A", "B"]),
  intro: SpokenSchema.optional().describe(
    "'Situation A viser …' (current format only)",
  ),
  question: QuestionSchema,
  followUps: z.array(QuestionSchema),
});

export const SecondQuestionSchema = z.object({
  question: QuestionSchema,
  followUps: z.array(QuestionSchema),
});

export const PictureSchema = z.object({
  file: z
    .string()
    .regex(
      /^\/sets\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|png|jpg)$/,
      "path under /public, e.g. /sets/2024-s/topic.webp",
    ),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: nonEmpty,
});

export const TopicSchema = z.object({
  id: SlugSchema,
  letter: z.enum(["A", "B", "C"]),
  title: SpokenSchema.describe("Topic title, e.g. 'Mangel på arbejdskraft'"),
  picture: PictureSchema.optional().describe(
    "The official sheet with the two pictures",
  ),
  situations: z
    .array(
      z.object({
        label: z.enum(["A", "B"]),
        caption: SpokenSchema,
        description: SpokenSchema.optional().describe(
          "What the picture shows (used as alt text)",
        ),
      }),
    )
    .optional()
    .describe("Picture captions, if the sheet has them"),
  firstQuestion: z.array(FirstQuestionOptionSchema).length(2),
  secondQuestion: SecondQuestionSchema,
});

export const ExamSetSchema = z
  .object({
    $schema: z.string().optional(),
    id: SetIdSchema,
    label: nonEmpty.describe(
      "Term as printed on the booklet, e.g. 'Maj-juni 2024'",
    ),
    format: z
      .enum(["current", "legacy-description"])
      .describe(
        "current: from May–June 2023 (no picture description). legacy-description: before that (candidate first described both pictures).",
      ),
    source: z.object({
      title: nonEmpty,
      url: z.url().optional(),
      note: z.string().optional(),
    }),
    topics: z.array(TopicSchema).min(1).max(3),
  })
  .superRefine((set, ctx) => {
    if (isConfidentialTerm(set.id)) {
      ctx.addIssue({
        code: "custom",
        path: ["id"],
        message:
          "PD3 exam material from the winter 2024 term onward is confidential (closed task bank) and must not be added",
      });
    }

    const topicIds = new Set<string>();
    for (const [ti, topic] of set.topics.entries()) {
      if (topicIds.has(topic.id)) {
        ctx.addIssue({
          code: "custom",
          path: ["topics", ti, "id"],
          message: `duplicate topic id "${topic.id}"`,
        });
      }
      topicIds.add(topic.id);

      const questionIds = new Set<string>();
      for (const q of allQuestions(topic)) {
        if (questionIds.has(q.id)) {
          ctx.addIssue({
            code: "custom",
            path: ["topics", ti],
            message: `duplicate question id "${q.id}" in topic "${topic.id}"`,
          });
        }
        questionIds.add(q.id);
      }

      if (set.format === "current") {
        for (const [oi, option] of topic.firstQuestion.entries()) {
          if (!option.intro) {
            ctx.addIssue({
              code: "custom",
              path: ["topics", ti, "firstQuestion", oi, "intro"],
              message:
                "current-format sets need the examiner's intro line for each situation",
            });
          }
        }
      }
    }
  });

export type ExamSet = z.infer<typeof ExamSetSchema>;
export type Topic = z.infer<typeof TopicSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type Answer = z.infer<typeof AnswerSchema>;
export type Spoken = z.infer<typeof SpokenSchema>;
export type FirstQuestionOption = z.infer<typeof FirstQuestionOptionSchema>;

/**
 * Since the winter 2024 term (November–December 2024) SIRI keeps all PD3 exam material in a closed,
 * reused task bank; it is confidential and may not be shared. Only earlier, public sets belong here.
 */
export function isConfidentialTerm(setId: string): boolean {
  const match = setId.match(/^(\d{4})-(s|v)$/);
  if (!match) return false;
  const year = Number(match[1]);
  return year > 2024 || (year === 2024 && match[2] === "v");
}

/** Every question in a topic, in exam order. */
export function allQuestions(
  topic: Pick<Topic, "firstQuestion" | "secondQuestion">,
): Question[] {
  return [
    ...topic.firstQuestion.flatMap((o) => [o.question, ...o.followUps]),
    topic.secondQuestion.question,
    ...topic.secondQuestion.followUps,
  ];
}
