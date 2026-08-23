#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { validateModelOutput } from "../scripts/validate_output.mjs";
import {
  INPUT_CONDITIONS,
  LANGUAGES,
  PARSE_STATUSES,
  sha256Utf8,
  validateRunRecord,
} from "../scripts/validate_run_record.mjs";
import { evaluateStructuralMetrics } from "../scripts/evaluate_structural_metrics.mjs";

const sourcePositive = "The group attacked the post in Kabul on Monday.";
const sourceNegative = "Officials denied reports of an attack in Kabul.";

function positiveOutput(overrides = {}) {
  return {
    event_present: true,
    event_type: "direct_attack_or_targeted_violence",
    action_text: "attacked",
    actor_or_side_a: ["The group"],
    target_or_side_b: ["the post"],
    location_text: "Kabul",
    date_text: "Monday",
    event_assertion_status: "reported_as_fact",
    actor_attribution_status: "reported_as_fact",
    claimant: [],
    evidence_quote: ["The group attacked the post in Kabul on Monday."],
    ...overrides,
  };
}

function negativeOutput() {
  return {
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
}

function runRecord({
  runId,
  itemId,
  language,
  condition,
  source,
  prompt,
  output,
  modelId = "test-model",
  pivotTranslationId = null,
  parseStatus = "parsed_json",
}) {
  const parsed = ["parsed_json", "repaired_json"].includes(parseStatus);
  const report = parsed
    ? validateModelOutput({ sourceText: source, output })
    : {
        schema_contract_valid: false,
        substring_valid: false,
        errors: [{ category: "runtime", code: "test_error", field: "$", message: "Synthetic runtime failure" }],
      };
  return {
    run_id: runId,
    item_id: itemId,
    language,
    input_condition: condition,
    model_provider: "test-provider",
    model_id: modelId,
    model_version: "test-v1",
    provider_request_id: null,
    run_timestamp_utc: "2026-08-04T00:00:00.000Z",
    prompt_version: "pilot-v0.1",
    schema_version: "pilot-v0.1",
    source_text_sha256: sha256Utf8(source),
    prompt_sha256: sha256Utf8(prompt),
    pivot_translation_id: pivotTranslationId,
    decoding: {
      temperature: 0,
      top_p: null,
      seed: null,
      max_output_tokens: 1000,
      tools_enabled: false,
      browsing_enabled: false,
      retrieval_enabled: false,
      response_format: "json_schema",
    },
    raw_response: parsed ? JSON.stringify(output) : "",
    parse_status: parseStatus,
    syntax_repair_applied: false,
    syntax_repair_description: null,
    parsed_output: parsed ? output : null,
    validation_report: {
      schema_contract_valid: report.schema_contract_valid,
      substring_valid: report.substring_valid,
      errors: report.errors,
    },
    latency_ms: null,
    input_tokens: null,
    output_tokens: null,
    runtime_error: parseStatus === "runtime_error"
      ? { error_class: "SyntheticError", message: "Synthetic runtime failure" }
      : null,
  };
}

const prompt = `Prompt\n${sourcePositive}`;
const validRun = runRecord({
  runId: "run-valid",
  itemId: "ps_001",
  language: "Pashto",
  condition: "original_language",
  source: sourcePositive,
  prompt,
  output: positiveOutput(),
});

const validation = validateRunRecord({ runRecord: validRun, sourceText: sourcePositive, renderedPrompt: prompt });
assert.equal(validation.valid, true);
assert.equal(validation.fully_verified, true);
assert.equal(validation.stored_validation_matches, true);

const tampered = structuredClone(validRun);
tampered.source_text_sha256 = "0".repeat(64);
const tamperedValidation = validateRunRecord({ runRecord: tampered, sourceText: sourcePositive, renderedPrompt: prompt });
assert.equal(tamperedValidation.valid, false);
assert(tamperedValidation.errors.some((error) => error.code === "source_hash_mismatch"));

const runSchema = JSON.parse(await fs.readFile(new URL("../schemas/run_record.schema.v0.1.json", import.meta.url), "utf8"));
assert.deepEqual(runSchema.properties.language.enum, LANGUAGES);
assert.deepEqual(runSchema.properties.input_condition.enum, INPUT_CONDITIONS);
assert.deepEqual(runSchema.properties.parse_status.enum, PARSE_STATUSES);
assert.deepEqual([...runSchema.required].sort(), Object.keys(validRun).sort());
assert.equal(
  runSchema.properties.parsed_output.oneOf[0].$ref,
  "https://example.org/lost-in-extraction/lean-event-record.schema.json",
);

const goldRows = [
  {
    item_id: "ps_001",
    language: "Pashto",
    gold: {
      event_present: true,
      event_type: "direct_attack_or_targeted_violence",
      event_assertion_status: "claimed_or_alleged",
      actor_attribution_status: "claimed_or_alleged",
    },
  },
  {
    item_id: "ps_002",
    language: "Pashto",
    gold: {
      event_present: false,
      event_type: null,
      event_assertion_status: "not_applicable",
      actor_attribution_status: "not_applicable",
    },
  },
  {
    item_id: "en_001",
    language: "English",
    gold: {
      event_present: true,
      event_type: "armed_clash",
      event_assertion_status: "reported_as_fact",
      actor_attribution_status: "reported_as_fact",
    },
  },
];

const positivePivotOutput = positiveOutput({
  event_type: "armed_clash",
  event_assertion_status: "claimed_or_alleged",
  actor_attribution_status: "claimed_or_alleged",
});
const fabricatedPivotOutput = positiveOutput({
  action_text: "attack",
  actor_or_side_a: ["Officials"],
  target_or_side_b: [],
  location_text: "Kabul",
  date_text: null,
  event_assertion_status: "claimed_or_alleged",
  actor_attribution_status: "unknown",
  evidence_quote: ["Officials denied reports of an attack in Kabul."],
});

const runtimeFailure = runRecord({
  runId: "run-en1-error",
  itemId: "en_001",
  language: "English",
  condition: "english_control",
  source: sourcePositive,
  prompt,
  output: null,
  parseStatus: "runtime_error",
});
const runtimeValidation = validateRunRecord({ runRecord: runtimeFailure, sourceText: sourcePositive, renderedPrompt: prompt });
assert.equal(runtimeValidation.valid, true);
assert.equal(runtimeValidation.fully_verified, true);

const runRows = [
  validRun,
  runRecord({
    runId: "run-ps1-pivot",
    itemId: "ps_001",
    language: "Pashto",
    condition: "english_pivot",
    source: sourcePositive,
    prompt,
    output: positivePivotOutput,
    pivotTranslationId: "pivot-ps-001",
  }),
  runRecord({
    runId: "run-ps2-original",
    itemId: "ps_002",
    language: "Pashto",
    condition: "original_language",
    source: sourceNegative,
    prompt: `Prompt\n${sourceNegative}`,
    output: negativeOutput(),
  }),
  runRecord({
    runId: "run-ps2-pivot",
    itemId: "ps_002",
    language: "Pashto",
    condition: "english_pivot",
    source: sourceNegative,
    prompt: `Prompt\n${sourceNegative}`,
    output: fabricatedPivotOutput,
    pivotTranslationId: "pivot-ps-002",
  }),
  runtimeFailure,
];

const evaluation = evaluateStructuralMetrics({ goldRows, runRows, bootstrap: 200, seed: 7 });
assert.equal(evaluation.groups.length, 3);

const originalGroup = evaluation.groups.find((group) => group.language === "Pashto" && group.input_condition === "original_language");
assert.equal(originalGroup.event_presence.tp, 1);
assert.equal(originalGroup.event_presence.tn, 1);
assert.equal(originalGroup.event_presence.end_to_end_accuracy, 1);
assert.equal(originalGroup.claim_to_fact.event_assertion.end_to_end.conversions, 1);

const pivotGroup = evaluation.groups.find((group) => group.language === "Pashto" && group.input_condition === "english_pivot");
assert.equal(pivotGroup.event_presence.tp, 1);
assert.equal(pivotGroup.event_presence.fp, 1);
assert.equal(pivotGroup.event_presence.fabricated_event_rate, 1);

const englishGroup = evaluation.groups.find((group) => group.language === "English");
assert.equal(englishGroup.event_presence.fn, 1);
assert.equal(englishGroup.event_presence.end_to_end_accuracy, 0);

assert.equal(evaluation.paired_original_vs_pivot.length, 1);
const pair = evaluation.paired_original_vs_pivot[0];
assert.equal(pair.event_presence_correctness.pivot_minus_original, -0.5);
assert.equal(pair.event_type_correctness_on_gold_positive.pivot_minus_original, -1);
assert.equal(pair.event_presence_correctness.confidence_interval.repetitions, 200);
assert("normalized_actor_or_side_a" in evaluation.not_computed);

assert.throws(
  () => evaluateStructuralMetrics({ goldRows, runRows: [...runRows, validRun], bootstrap: 0, seed: 1 }),
  /duplicate analysis cell/u,
);

process.stdout.write("PASS: run-record validation and structural evaluation tests\n");
