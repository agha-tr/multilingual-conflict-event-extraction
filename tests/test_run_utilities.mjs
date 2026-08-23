import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractPromptTemplate, renderPrompt } from "../scripts/render_prompt.mjs";
import {
  ACTOR_STATUSES,
  EVENT_STATUSES,
  EVENT_TYPES,
  REQUIRED_FIELDS,
  validateModelOutput,
} from "../scripts/validate_output.mjs";

const testDir = path.dirname(fileURLToPath(import.meta.url));
const paperDir = path.resolve(testDir, "..");
const promptMarkdownV02 = await fs.readFile(path.join(paperDir, "prompts", "EXTRACTION_PROMPT_PILOT_v0.2.md"), "utf8");
const schema = JSON.parse(await fs.readFile(path.join(paperDir, "schemas", "lean_event_record.schema.v0.1.json"), "utf8"));

const sameSet = (left, right) => assert.deepEqual([...left].sort(), [...right].sort());
sameSet(REQUIRED_FIELDS, schema.required);
sameSet(REQUIRED_FIELDS, Object.keys(schema.properties));
sameSet(EVENT_TYPES, schema.properties.event_type.enum.filter((value) => value !== null));
sameSet(EVENT_STATUSES, schema.properties.event_assertion_status.enum);
sameSet(ACTOR_STATUSES, schema.properties.actor_attribution_status.enum);

const sourceText = "Central City police said officers arrested two suspects in Central City on Monday.";
const templateV02 = extractPromptTemplate(promptMarkdownV02);
const renderedV02 = renderPrompt(templateV02, {
  item_id: "FIXTURE-EN-001",
  input_condition: "english_control",
  language: "English",
  publication_date: "2026-08-04",
  text: sourceText,
});
assert.ok(renderedV02.includes(sourceText));
assert.ok(renderedV02.includes("publication_or_post_date: 2026-08-04"));
assert.ok(!renderedV02.includes("FIXTURE-EN-001"));
assert.ok(!renderedV02.includes("english_control"));
assert.ok(!renderedV02.includes("language: English"));
assert.ok(!/\{\{[A-Z_]+\}\}/u.test(renderedV02));
assert.throws(() => renderPrompt(templateV02, {
  item_id: "FIXTURE-EN-002",
  input_condition: "original_language",
  language: "English",
  publication_date: "2026-08-04",
  text: sourceText,
}), /English items must use/);

const positive = {
  event_present: true,
  event_type: "arrest_detention_or_security_raid",
  action_text: "arrested",
  actor_or_side_a: ["officers"],
  target_or_side_b: ["two suspects"],
  location_text: "Central City",
  date_text: "Monday",
  event_assertion_status: "reported_as_fact",
  actor_attribution_status: "reported_as_fact",
  claimant: ["Central City police"],
  evidence_quote: [sourceText],
};
assert.equal(validateModelOutput({ sourceText, output: positive }).valid, true);

const negative = {
  event_present: false,
  event_type: null,
  action_text: null,
  actor_or_side_a: [],
  target_or_side_b: [],
  location_text: null,
  date_text: null,
  event_assertion_status: "not_applicable",
  actor_attribution_status: "not_applicable",
  claimant: [],
  evidence_quote: [],
};
assert.equal(validateModelOutput({ sourceText: "Officials warned of a possible attack next month.", output: negative }).valid, true);

const unsupportedActor = structuredClone(positive);
unsupportedActor.actor_or_side_a = ["national police"];
const unsupportedReport = validateModelOutput({ sourceText, output: unsupportedActor });
assert.equal(unsupportedReport.schema_contract_valid, true);
assert.equal(unsupportedReport.substring_valid, false);
assert.ok(unsupportedReport.errors.some((error) => error.code === "not_verbatim_substring"));

const invalidNegative = structuredClone(negative);
invalidNegative.evidence_quote = ["possible attack"];
const invalidNegativeReport = validateModelOutput({ sourceText, output: invalidNegative });
assert.equal(invalidNegativeReport.schema_contract_valid, false);
assert.ok(invalidNegativeReport.errors.some((error) => error.code === "negative_pattern_mismatch"));

const extraProperty = { ...positive, explanation: "not allowed" };
const extraPropertyReport = validateModelOutput({ sourceText, output: extraProperty });
assert.equal(extraPropertyReport.schema_contract_valid, false);
assert.ok(extraPropertyReport.errors.some((error) => error.code === "additional_property"));

process.stdout.write("PASS: prompt renderer and output validator contract tests\n");
