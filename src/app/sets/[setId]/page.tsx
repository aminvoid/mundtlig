import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSet, getSets } from "@/lib/content";

export async function generateStaticParams() {
  const sets = await getSets();
  return sets.map((set) => ({ setId: set.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/sets/[setId]">): Promise<Metadata> {
  const { setId } = await params;
  const set = await getSet(setId);
  return { title: set ? set.label : "Not found" };
}

export default async function SetPage({ params }: PageProps<"/sets/[setId]">) {
  const { setId } = await params;
  const set = await getSet(setId);
  if (!set) notFound();

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
        <Link href="/sets" className="hover:underline">
          Questions
        </Link>{" "}
        / {set.label}
      </nav>
      <h1 className="text-3xl font-bold tracking-tight">{set.label}</h1>
      <p className="text-sm text-muted-foreground">
        Source:{" "}
        {set.source.url ? (
          <a
            href={set.source.url}
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            {set.source.title}
          </a>
        ) : (
          set.source.title
        )}
      </p>
      <ul className="grid gap-4 sm:grid-cols-3">
        {set.topics.map((topic) => (
          <li key={topic.id}>
            <Link
              href={`/sets/${set.id}/${topic.id}`}
              className="block space-y-3 rounded-xl border p-3 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
            >
              {topic.picture && (
                <Image
                  src={topic.picture.file}
                  width={topic.picture.width}
                  height={topic.picture.height}
                  alt=""
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="h-auto w-full rounded-md border bg-white"
                />
              )}
              <span className="block text-xs text-muted-foreground">
                Emne {topic.letter}
              </span>
              <span lang="da" className="block font-medium">
                {topic.title.da}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
