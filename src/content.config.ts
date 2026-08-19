import { glob } from "astro/loaders"
import { defineCollection } from "astro:content"
import { z } from "astro/zod"

const blog = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: "./src/content/blog",
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      category: z.string(),
      tags: z.array(z.string()).default([]),
      image: image().optional(),
      draft: z.boolean().default(false),
    }),
})

const projects = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: "./src/content/projects",
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      repository: z.url(),
      website: z.url().optional(),
      language: z.string().optional(),
      icon: z.string().optional(),
      stars: z.number().int().nonnegative().optional(),
      forks: z.number().int().nonnegative().optional(),
      tags: z.array(z.string()).default([]),
      image: image().optional(),
      order: z.number().int().default(0),
    }),
})

const publications = defineCollection({
  loader: glob({
    pattern: "**/[^_]*.md",
    base: "./src/content/publications",
  }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    venue: z.string().optional(),
    year: z.number().int(),
    note: z.string().optional(),
    doi: z.url().optional(),
    arxiv: z.url().optional(),
    paper: z.url().optional(),
    code: z.url().optional(),
    order: z.number().int().default(0),
  }),
})

export const collections = { blog, projects, publications }
