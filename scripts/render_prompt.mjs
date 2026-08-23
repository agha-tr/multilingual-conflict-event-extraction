#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ALLOWED_LANGUAGES = ["English", "Turkish", "Arabic", "Persian", "Urdu", "Pashto"];
export const ALLOWED_INPUT_CONDITIONS = ["original_language", "english_pivot", "english_control"];

const REQUIRED_ITEM_FIELDS = ["item_id", "input_condition", "language", "publication_date", "text"];
const PLACEHOLDERS = {
  item_id: "{{ITEM_ID}}",
  input_condition: "{{INPUT_CONDITION}}",
  language: "{{LANGUAGE}}",
  publication_date: "{{PUBLICATION_DATE}}",
  text: "{{TEXT}}",
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultPromptPath = path.resolve(scriptDir, "../prompts/EXTRACTION_PROMPT_PILOT_v0.2.md");

export function extractPromptTemplate(markdown) {
  const sectionStart = markdown.indexOf("## Exact prompt template");
  if (sectionStart < 0) throw new Error("Prompt artifact has no 'Exact prompt template' section");
  const section = markdown.slice(sectionStart);
  const match = section.match(/```text\s*\n([\s\S]*?)\n```/u);
  if (!match) throw new Error("Could not extract the fenced exact prompt template");
  return match[1];
}

export function validatePromptItem(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Item must be a JSON object");
  for (const field of REQUIRED_ITEM_FIELDS) {
    if (!(field in item)) throw new Error(`Item is missing required field '${field}'`);
    if (typeof item[field] !== "string") throw new Error(`Item field '${field}' must be a string`);
  }
  if (!item.item_id.trim() || /[\r\n]/u.test(item.item_id)) throw new Error("item_id must be a non-empty single-line string");
  if (!ALLOWED_LANGUAGES.includes(item.language)) throw new Error(`Unsupported language '${item.language}'`);
  if (!ALLOWED_INPUT_CONDITIONS.includes(item.input_condition)) throw new Error(`Unsupported input_condition '${item.input_condition}'`);
  if (!item.text.trim()) throw new Error("text must not be empty");
  if (!(item.publication_date === "unknown" || /^\d{4}-\d{2}-\d{2}$/u.test(item.publication_date))) {
    throw new Error("publication_date must be YYYY-MM-DD or 'unknown'");
  }
  if (item.language === "English" && item.input_condition !== "english_control") {
    throw new Error("English items must use input_condition 'english_control'");
  }
  if (item.language !== "English" && item.input_condition === "english_control") {
    throw new Error("Non-English items cannot use input_condition 'english_control'");
  }
}

export function renderPrompt(template, item) {
  validatePromptItem(item);
  let rendered = template;
  for (const [field, placeholder] of Object.entries(PLACEHOLDERS)) {
    rendered = rendered.split(placeholder).join(item[field]);
  }
  const unreplaced = rendered.match(/\{\{[A-Z_]+\}\}/gu);
  if (unreplaced) throw new Error(`Unreplaced prompt placeholder(s): ${[...new Set(unreplaced)].join(", ")}`);
  return rendered;
}

async function main() {
  const itemPath = process.argv[2];
  const promptPath = process.argv[3] ? path.resolve(process.argv[3]) : defaultPromptPath;
  if (!itemPath) {
    throw new Error("Usage: node render_prompt.mjs ITEM_JSON [PROMPT_MARKDOWN]");
  }
  const item = JSON.parse(await fs.readFile(path.resolve(itemPath), "utf8"));
  const markdown = await fs.readFile(promptPath, "utf8");
  const template = extractPromptTemplate(markdown);
  process.stdout.write(`${renderPrompt(template, item)}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
