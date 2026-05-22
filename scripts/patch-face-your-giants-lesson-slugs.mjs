#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const COURSE_SLUG = "face-your-giants";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const raw = readFileSync(envPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      let value = trimmed.slice(eqIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // env may already be injected by the caller
  }
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function parseArgs() {
  return {
    write: process.argv.includes("--write"),
  };
}

async function main() {
  loadEnv();
  const args = parseArgs();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: course, error: courseError } = await supabase
    .from("course")
    .select("id, title, slug")
    .eq("slug", COURSE_SLUG)
    .single();

  if (courseError || !course) {
    throw new Error(`Could not load ${COURSE_SLUG}: ${courseError?.message ?? "not found"}`);
  }

  const { data: modules, error: moduleError } = await supabase
    .from("course_module")
    .select("id")
    .eq("course_id", course.id);

  if (moduleError) {
    throw new Error(`Could not load modules: ${moduleError.message}`);
  }

  const moduleIds = (modules ?? []).map((module) => module.id);
  if (moduleIds.length === 0) {
    console.log("No modules found; nothing to patch.");
    return;
  }

  const { data: lessons, error: lessonError } = await supabase
    .from("course_lesson")
    .select("id, title, slug, sort_order")
    .in("module_id", moduleIds)
    .order("sort_order", { ascending: true });

  if (lessonError) {
    throw new Error(`Could not load lessons: ${lessonError.message}`);
  }

  let changed = 0;
  for (const lesson of lessons ?? []) {
    if (lesson.slug) {
      console.log(`- SKIP ${lesson.title} :: ${lesson.slug}`);
      continue;
    }

    const slug = slugify(lesson.title);
    if (!slug) {
      console.log(`- SKIP ${lesson.title} :: could not derive slug`);
      continue;
    }

    if (args.write) {
      const { error } = await supabase
        .from("course_lesson")
        .update({ slug, updated_at: new Date().toISOString() })
        .eq("id", lesson.id);

      if (error) {
        throw new Error(`Could not update ${lesson.title}: ${error.message}`);
      }
    }

    changed += 1;
    console.log(`- ${args.write ? "UPDATE" : "WOULD-UPDATE"} ${lesson.title} :: ${slug}`);
  }

  console.log(`\n${args.write ? "Updated" : "Would update"} ${changed} lesson slug${changed === 1 ? "" : "s"}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
