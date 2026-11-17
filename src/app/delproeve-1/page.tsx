import type { Metadata } from "next";
import { PresentationTrainer } from "@/components/presentation-trainer";

export const metadata: Metadata = { title: "Delprøve 1 – presentation" };

export default function DelproeveOnePage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Presentation trainer — delprøve 1
        </h1>
        <p className="text-muted-foreground">
          Your school gives you a topic five weekdays before the oral exam.
          Present it for about 2 minutes without help, then answer the
          examiner's follow-up questions for about 2½ minutes.
        </p>
      </div>
      <PresentationTrainer />
    </div>
  );
}
