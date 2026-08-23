#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REQUIRED_FIELDS = [
  "event_present",
  "event_type",
  "action_text",
  "actor_or_side_a",
  "target_or_side_b",
  "location_text",
  "date_text",
  "event_assertion_status",
  "actor_attribution_status",
  "claimant",
  "evidence_quote",
];

export const EVENT_TYPES = [
  "armed_clash",
  "remote_or_explosive_violence",
  "direct_attack_or_targeted_violence",
  "arrest_detention_or_security_raid",
  "abduction_or_disappearance",
  "protest_or_violent_disorder",
  "disrupted_or_foiled_attack",
  "other_eligible_event",
];

export const EVENT_STATUSES = ["reported_as_fact", "claimed_or_alleged", "disputed", "denied", "not_applicable"];
export const ACTOR_STATUSES = ["reported_as_fact", "claimed_or_alleged", "disputed", "denied", "unknown", "not_applicable"];

const normalizeNewlines = (value) => value.replace(/\r\n?/gu, "\n");
const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const hasUniqueItems = (values) => new Set(values).size === values.length;

function addError(errors, category, code, field, message) {
  errors.push({ category, code, field, message });
}

function validateStringArray(value, field, errors, { minItems = 0, maxItems = null } = {}) {
  if (!Array.isArray(value)) {
    addError(errors, "structure", "wrong_type", field, "Expected an array");
    return;
  }
  if (value.some((item) => !isNonEmptyString(item))) {
    addError(errors, "structure", "invalid_array_item", field, "Every array item must be a non-empty string");
  }
  if (!hasUniqueItems(value)) addError(errors, "structure", "duplicate_array_item", field, "Array items must be unique");
  if (value.length < minItems) addError(errors, "structure", "too_few_items", field, `Expected at least ${minItems} item(s)`);
  if (maxItems !== null && value.length > maxItems) addError(errors, "structure", "too_many_items", field, `Expected at most ${maxItems} item(s)`);
}

function requireExactNegative(output, errors) {
  const expected = {
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
  for (const field of REQUIRED_FIELDS) {
    if (JSON.stringify(output[field]) !== JSON.stringify(expected[field])) {
      addError(errors, "structure", "negative_pattern_mismatch", field, `Negative record must use ${JSON.stringify(expected[field])}`);
    }
  }
}

function checkSubstring(source, value, field, errors) {
  if (!normalizeNewlines(source).includes(normalizeNewlines(value))) {
    addError(errors, "substring", "not_verbatim_substring", field, "Value does not occur verbatim in the supplied source after newline normalization");
  }
}

export function validateModelOutput({ sourceText, output }) {
  const errors = [];
  if (typeof sourceText !== "string") {
    addError(errors, "input", "invalid_source", "sourceText", "Source text must be a string");
  }
  if (!isPlainObject(output)) {
    addError(errors, "structure", "wrong_top_level_type", "$", "Output must be one JSON object");
    return {
      valid: false,
      schema_contract_valid: false,
      substring_valid: false,
      errors,
      limitation: "This validator checks structure and exact substrings only; it does not assess semantic correctness or source faithfulness against original-language gold.",
    };
  }

  const actualFields = Object.keys(output);
  for (const field of REQUIRED_FIELDS) {
    if (!(field in output)) addError(errors, "structure", "missing_field", field, "Required field is missing");
  }
  for (const field of actualFields) {
    if (!REQUIRED_FIELDS.includes(field)) addError(errors, "structure", "additional_property", field, "Additional properties are not allowed");
  }

  if (typeof output.event_present !== "boolean") {
    addError(errors, "structure", "wrong_type", "event_present", "Expected a boolean");
  } else if (output.event_present === false) {
    requireExactNegative(output, errors);
  } else {
    if (!EVENT_TYPES.includes(output.event_type)) addError(errors, "structure", "invalid_enum", "event_type", "Invalid positive event type");
    if (!isNonEmptyString(output.action_text)) addError(errors, "structure", "wrong_type", "action_text", "Positive record requires a non-empty string");
    validateStringArray(output.actor_or_side_a, "actor_or_side_a", errors);
    validateStringArray(output.target_or_side_b, "target_or_side_b", errors);
    validateStringArray(output.claimant, "claimant", errors);
    validateStringArray(output.evidence_quote, "evidence_quote", errors, { minItems: 1, maxItems: 3 });
    for (const field of ["location_text", "date_text"]) {
      if (!(output[field] === null || isNonEmptyString(output[field]))) {
        addError(errors, "structure", "wrong_type", field, "Expected null or a non-empty string");
      }
    }
    if (!EVENT_STATUSES.slice(0, 4).includes(output.event_assertion_status)) {
      addError(errors, "structure", "invalid_enum", "event_assertion_status", "Invalid positive event-assertion status");
    }
    if (!ACTOR_STATUSES.slice(0, 5).includes(output.actor_attribution_status)) {
      addError(errors, "structure", "invalid_enum", "actor_attribution_status", "Invalid positive actor-attribution status");
    }
  }

  const structureErrors = errors.filter((error) => error.category === "structure" || error.category === "input");
  if (structureErrors.length === 0 && output.event_present === true) {
    checkSubstring(sourceText, output.action_text, "action_text", errors);
    for (const field of ["location_text", "date_text"]) {
      if (output[field] !== null) checkSubstring(sourceText, output[field], field, errors);
    }
    for (const field of ["actor_or_side_a", "target_or_side_b", "claimant", "evidence_quote"]) {
      output[field].forEach((value, index) => checkSubstring(sourceText, value, `${field}[${index}]`, errors));
    }
  }

  const schemaContractValid = errors.every((error) => error.category !== "structure" && error.category !== "input");
  const substringValid = schemaContractValid && errors.every((error) => error.category !== "substring");
  return {
    valid: schemaContractValid && substringValid,
    schema_contract_valid: schemaContractValid,
    substring_valid: substringValid,
    errors,
    limitation: "This validator checks structure and exact substrings only; it does not assess semantic correctness or source faithfulness against original-language gold.",
  };
}

async function main() {
  const sourcePath = process.argv[2];
  const outputPath = process.argv[3];
  if (!sourcePath || !outputPath) throw new Error("Usage: node validate_output.mjs SOURCE_TEXT_FILE MODEL_OUTPUT_JSON");
  const sourceText = await fs.readFile(path.resolve(sourcePath), "utf8");
  let output;
  try {
    output = JSON.parse(await fs.readFile(path.resolve(outputPath), "utf8"));
  } catch (error) {
    const report = {
      valid: false,
      schema_contract_valid: false,
      substring_valid: false,
      errors: [{ category: "structure", code: "invalid_json", field: "$", message: error.message }],
      limitation: "This validator checks structure and exact substrings only; it does not assess semantic correctness or source faithfulness against original-language gold.",
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  const report = validateModelOutput({ sourceText, output });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.valid) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
