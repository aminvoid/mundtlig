import { AUDIO_DIR, audioFileName, type VoiceRole } from "./audio";
import { CLOSING_LINE, examinerIntro, TRANSITION_LINE } from "./examiner";
import type {
  Answer,
  ExamSet,
  FirstQuestionOption,
  Question,
  Spoken,
  Topic,
} from "./schema";

/**
 * View models: what the pages and client components receive.
 * Pure functions only (no file system), so they are easy to unit test.
 */

/** One thing to say out loud. `src` is set when a generated audio file exists. */
export type SpeechItem = { text: string; src?: string };

export type SpokenView = { da: string; en?: string; speech: SpeechItem };
export type AnswerView = {
  sentences: SpeechItem[];
  en: string;
  status: Answer["status"];
};
export type QuestionView = {
  /** Globally unique: `<setId>/<topicId>/<questionId>`; used for progress tracking. */
  key: string;
  id: string;
  da: string;
  en?: string;
  speech: SpeechItem;
  answer?: AnswerView;
};
export type OptionView = {
  label: FirstQuestionOption["label"];
  intro?: SpokenView;
  question: QuestionView;
  followUps: QuestionView[];
};
export type TopicView = {
  setId: string;
  setLabel: string;
  format: ExamSet["format"];
  id: string;
  letter: Topic["letter"];
  title: SpokenView;
  picture?: Topic["picture"];
  situations?: {
    label: "A" | "B";
    caption: SpokenView;
    description?: Spoken;
  }[];
  examinerIntro: SpokenView;
  transition: SpokenView;
  closing: SpokenView;
  firstQuestion: OptionView[];
  secondQuestion: { question: QuestionView; followUps: QuestionView[] };
  questionCount: number;
  answerCount: number;
};
export type SetView = {
  id: string;
  label: string;
  format: ExamSet["format"];
  source: ExamSet["source"];
  topics: TopicView[];
};

/** Checks whether `public/audio/<file>` exists. Injected so this module stays pure. */
export type AudioExists = (fileName: string) => boolean;

function speech(
  role: VoiceRole,
  text: string,
  audioExists: AudioExists,
): SpeechItem {
  const file = audioFileName(role, text);
  return audioExists(file) ? { text, src: `/${AUDIO_DIR}/${file}` } : { text };
}

function spoken(s: Spoken, audioExists: AudioExists): SpokenView {
  return { da: s.da, en: s.en, speech: speech("examiner", s.da, audioExists) };
}

export function buildSetView(set: ExamSet, audioExists: AudioExists): SetView {
  return {
    id: set.id,
    label: set.label,
    format: set.format,
    source: set.source,
    topics: set.topics.map((topic) => buildTopicView(set, topic, audioExists)),
  };
}

function buildTopicView(
  set: ExamSet,
  topic: Topic,
  audioExists: AudioExists,
): TopicView {
  const question = (q: Question): QuestionView => ({
    key: `${set.id}/${topic.id}/${q.id}`,
    id: q.id,
    da: q.da,
    en: q.en,
    speech: speech("examiner", q.da, audioExists),
    answer: q.answer && {
      en: q.answer.en,
      status: q.answer.status,
      sentences: q.answer.sentences.map((s) =>
        speech("answer", s, audioExists),
      ),
    },
  });

  const firstQuestion = topic.firstQuestion.map((o) => ({
    label: o.label,
    intro: o.intro && spoken(o.intro, audioExists),
    question: question(o.question),
    followUps: o.followUps.map(question),
  }));
  const secondQuestion = {
    question: question(topic.secondQuestion.question),
    followUps: topic.secondQuestion.followUps.map(question),
  };
  const all = [
    ...firstQuestion.flatMap((o) => [o.question, ...o.followUps]),
    secondQuestion.question,
    ...secondQuestion.followUps,
  ];

  return {
    setId: set.id,
    setLabel: set.label,
    format: set.format,
    id: topic.id,
    letter: topic.letter,
    title: spoken(topic.title, audioExists),
    picture: topic.picture && {
      ...topic.picture,
      alt: pictureAlt(topic.picture.alt, topic.situations),
    },
    situations: topic.situations?.map((s) => ({
      label: s.label,
      caption: spoken(s.caption, audioExists),
      description: s.description,
    })),
    examinerIntro: spoken({ da: examinerIntro(topic.title.da) }, audioExists),
    transition: spoken({ da: TRANSITION_LINE }, audioExists),
    closing: spoken({ da: CLOSING_LINE }, audioExists),
    firstQuestion,
    secondQuestion,
    questionCount: all.length,
    answerCount: all.filter((q) => q.answer).length,
  };
}

/**
 * Alt text for a picture sheet (Danish): the sheet's title plus each situation's caption and
 * description, so screen-reader users get what sighted users see in the 10-second look.
 */
export function pictureAlt(
  base: string,
  situations: Topic["situations"],
): string {
  const parts = (situations ?? []).map(
    (s) =>
      `Situation ${s.label}: ${s.caption.da}${s.description ? `. ${s.description.da}` : ""}`,
  );
  return [base, ...parts]
    .map((p) => p.replace(/\.$/, ""))
    .join(". ")
    .concat(".");
}

/** Everything in a set that should have audio, with the voice to use. Used by `audio:generate`. */
export function collectSpeech(
  set: ExamSet,
): { role: VoiceRole; text: string }[] {
  const items: { role: VoiceRole; text: string }[] = [
    { role: "examiner", text: TRANSITION_LINE },
    { role: "examiner", text: CLOSING_LINE },
  ];
  const addQuestion = (q: Question) => {
    items.push({ role: "examiner", text: q.da });
    for (const s of q.answer?.sentences ?? [])
      items.push({ role: "answer", text: s });
  };
  for (const topic of set.topics) {
    items.push({ role: "examiner", text: examinerIntro(topic.title.da) });
    for (const option of topic.firstQuestion) {
      if (option.intro) items.push({ role: "examiner", text: option.intro.da });
      addQuestion(option.question);
      option.followUps.forEach(addQuestion);
    }
    addQuestion(topic.secondQuestion.question);
    topic.secondQuestion.followUps.forEach(addQuestion);
  }
  // De-duplicate (e.g. the same follow-up wording in two topics).
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = `${i.role}|${i.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
