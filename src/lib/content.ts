import { SITE } from "@/consts"
import { getCollection, type CollectionEntry } from "astro:content"

export const pageTitle = (title: string) => `${title} | ${SITE.title}`

export async function getPosts(): Promise<CollectionEntry<"blog">[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft)
  return posts.sort((a, b) => b.data.date.getTime() - a.data.date.getTime())
}

export async function getCategories(): Promise<
  Map<string, CollectionEntry<"blog">[]>
> {
  const categories = new Map<string, CollectionEntry<"blog">[]>()
  for (const post of await getPosts()) {
    const entries = categories.get(post.data.category)
    if (entries) entries.push(post)
    else categories.set(post.data.category, [post])
  }
  return new Map(
    [...categories].sort(
      ([a, postsA], [b, postsB]) =>
        postsB.length - postsA.length || a.localeCompare(b, "zh-CN"),
    ),
  )
}
