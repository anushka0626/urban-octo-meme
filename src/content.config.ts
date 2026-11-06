import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const links = z
  .object({
    github: z.string().optional(),
    demo: z.string().optional(),
    paper: z.string().optional(),
    other: z.string().optional(),
  })
  .default({});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tech: z.array(z.string()).default([]),
    role: z.string().optional(),
    date: z.string(), // free-form, e.g. "2025" or "Jan – Apr 2025"
    order: z.number().default(99), // lower = shown first
    icon: z.string().default('app'), // file name in /public/icons (without .svg)
    featured: z.boolean().default(false),
    links,
  }),
});

const research = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/research' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    status: z.string().default('ongoing'), // e.g. "ongoing", "under review", "published"
    venue: z.string().optional(),
    date: z.string(),
    order: z.number().default(99),
    tags: z.array(z.string()).default([]),
    links,
  }),
});

const writing = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/writing' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
  }),
});

export const collections = { projects, research, writing };
