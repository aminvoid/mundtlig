import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        This exam set or topic doesn't exist.
      </p>
      <Link href="/sets" className={buttonVariants({ variant: "outline" })}>
        Back to the questions
      </Link>
    </div>
  );
}
