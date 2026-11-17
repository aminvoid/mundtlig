import "server-only";
import { cacheLife } from "next/cache";
import { readAllSetViews } from "./content-fs";
import type { SetView, TopicView } from "./content-view";

/**
 * Content access for Server Components. Content only changes when you edit the JSON files and
 * rebuild, so results are cached for as long as possible and every page prerenders statically.
 */

export async function getSets(): Promise<SetView[]> {
  "use cache";
  cacheLife("max");
  return readAllSetViews();
}

export async function getSet(setId: string): Promise<SetView | undefined> {
  const sets = await getSets();
  return sets.find((s) => s.id === setId);
}

export async function getTopic(
  setId: string,
  topicId: string,
): Promise<TopicView | undefined> {
  const set = await getSet(setId);
  return set?.topics.find((t) => t.id === topicId);
}

/** Topics with every question in one flat list, for the mock exam. */
export async function getAllTopics(): Promise<TopicView[]> {
  const sets = await getSets();
  return sets.flatMap((s) => s.topics);
}
