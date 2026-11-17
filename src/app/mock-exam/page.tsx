import type { Metadata } from "next";
import { MockExam } from "@/components/mock-exam";
import { getAllTopics } from "@/lib/content";

export const metadata: Metadata = { title: "Mock exam" };

export default async function MockExamPage() {
  const topics = await getAllTopics();
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Mock exam — delprøve 2
        </h1>
        <p className="text-muted-foreground">
          Like the real exam: the examiner reads the questions aloud and the
          clock keeps running. Answer out loud, in full sentences, with reasons
          and examples.
        </p>
      </div>
      <MockExam topics={topics} />
    </div>
  );
}
