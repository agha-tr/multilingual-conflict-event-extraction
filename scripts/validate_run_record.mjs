#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateModelOutput } from "./validate_output.mjs";

export const LANGUAGES = ["English", "Turkish", "Arabic", "Persian", "Urdu", "Pashto"];
export const INPUT_CONDITIONS = ["english_control", "original_language", "english_pivot"];
export const PARSE_STATUSES = ["parsed_json", "repaired_json", "invalid_json", "runtime_error"];

const REQUIRED_FIELDS = [
  "run_id",
  "item_id",
  "language",
  "input_condition",
  "model_provider",
  "model_id",
  "model_version",
  "provider_request_id",
  "run_timestamp_utc",
  "prompt_version",
  "schema_version",
  "source_text_sha256",
  "prompt_sha256",
  "pivot_translation_id",
  "decoding",
  "raw_response",
  "parse_status",
  "syntax_repair_applied",
  "syntax_repair_description",
  "parsed_output",
  "validation_report",
  "latency_ms",
  "input_tokens",
  "output_tokens",
  "runtime_error",
];

const DECODING_FIELDS = [
  "temperature",
  "top_p",
  "seed",
  "max_output_tokens",
  "tools_enabled",
  "browsing_enabled",
  "retrieval_enabled",
  "response_format",
];

const VALIDATION_REPORT_FIELDS = ["schema_contract_valid", "substring_valid", "errors"];
const HASH_PATTERN = /^[0-9a-f]{64}$/u;
const RESPONSE_FORMATS = ["json_schema", "json_object", "text_json"];

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
const isNullableNonEmptyString = (value) => value === null || isNonEmptyString(value);
const isNullableNonNegativeNumber = (value) => value === null || (typeof value === "number" && Number.isFinite(value) && value >= 0);
const isNullableNonNegativeInteger = (value) => value === null || (Number.isInteger(value) && value >= 0);

function addError(errors, code, field, message) {
  errors.push({ code, field, message });
}

function validateExactFields(value, required, field, errors) {
  if (!isPlainObject(value)) {
    addError(errors, "wrong_type", field, "Expected an object");
    return false;
  }
  for (const name of required) {
    if (!(name in value)) addError(errors, "missing_field", `${field}.${name}`, "Required field is missing");
  }
  for (const name of Object.keys(value)) {
    if (!required.includes(name)) addError(errors, "additional_property", `${field}.${name}`, "Additional properties are not allowed");
  }
  return true;
}

function validateStoredError(value, index, errors) {
  const prefix = `validation_report.errors[${index}]`;
  if (!validateExactFields(value, ["category", "code", "field", "message"], prefix, errors)) return;
  for (const name of ["category", "code", "field", "message"]) {
    if (!isNonEmptyString(value[name])) addError(errors, "wrong_type", `${prefix}.${name}`, "Expected a non-empty string");
  }
}

export function sha256Utf8(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

export function validateRunRecord({ runRecord, sourceText, renderedPrompt = null }) {
  const errors = [];
  const warnings = [];
  if (!validateExactFields(runRecord, REQUIRED_FIELDS, "$", errors)) {
    return {
      valid: false,
      fully_verified: false,
      metadata_valid: false,
      source_hash_valid: false,
      prompt_hash_valid: null,
      stored_validation_matches: false,
      model_output_validation: null,
      errors,
      warnings,
    };
  }

  for (const field of ["run_id", "item_id", "model_provider", "model_id", "prompt_version", "schema_version"]) {
    if (!isNonEmptyString(runRecord[field])) addError(errors, "wrong_type", field, "Expected a non-empty string");
  }
  for (const field of ["model_version", "provider_request_id", "pivot_translation_id", "syntax_repair_description"]) {
    if (!isNullableNonEmptyString(runRecord[field])) addError(errors, "wrong_type", field, "Expected null or a non-empty string");
  }
  if (!LANGUAGES.includes(runRecord.language)) addError(errors, "invalid_enum", "language", "Unknown study language");
  if (!INPUT_CONDITIONS.includes(runRecord.input_condition)) addError(errors, "invalid_enum", "input_condition", "Unknown input condition");
  if (!PARSE_STATUSES.includes(runRecord.parse_status)) addError(errors, "invalid_enum", "parse_status", "Unknown parse status");
  if (typeof runRecord.raw_response !== "string") addError(errors, "wrong_type", "raw_response", "Expected a string");
  if (typeof runRecord.syntax_repair_applied !== "boolean") addError(errors, "wrong_type", "syntax_repair_applied", "Expected a boolean");

  const parsedTimestamp = typeof runRecord.run_timestamp_utc === "string" ? Date.parse(runRecord.run_timestamp_utc) : Number.NaN;
  if (!Number.isFinite(parsedTimestamp) || !runRecord.run_timestamp_utc.endsWith("Z")) {
    addError(errors, "invalid_utc_timestamp", "run_timestamp_utc", "Expected a valid ISO 8601 timestamp ending in Z");
  }
  for (const field of ["source_text_sha256", "prompt_sha256"]) {
    if (typeof runRecord[field] !== "string" || !HASH_PATTERN.test(runRecord[field])) {
      addError(errors, "invalid_sha256", field, "Expected 64 lowercase hexadecimal characters");
    }
  }

  if (runRecord.language === "English") {
    if (runRecord.input_condition !== "english_control") addError(errors, "invalid_condition", "input_condition", "English items require english_control");
    if (runRecord.pivot_translation_id !== null) addError(errors, "invalid_pivot_reference", "pivot_translation_id", "English-control runs require null");
  } else if (LANGUAGES.includes(runRecord.language)) {
    if (!["original_language", "english_pivot"].includes(runRecord.input_condition)) {
      addError(errors, "invalid_condition", "input_condition", "Non-English items require original_language or english_pivot");
    }
  }
  if (runRecord.input_condition === "english_pivot") {
    if (!isNonEmptyString(runRecord.pivot_translation_id)) addError(errors, "missing_pivot_reference", "pivot_translation_id", "English-pivot runs require a translation identifier");
  } else if (runRecord.pivot_translation_id !== null) {
    addError(errors, "unexpected_pivot_reference", "pivot_translation_id", "Non-pivot runs require null");
  }

  if (validateExactFields(runRecord.decoding, DECODING_FIELDS, "decoding", errors)) {
    if (!(runRecord.decoding.temperature === null || (typeof runRecord.decoding.temperature === "number" && Number.isFinite(runRecord.decoding.temperature)))) {
      addError(errors, "wrong_type", "decoding.temperature", "Expected null or a finite number");
    }
    if (!(runRecord.decoding.top_p === null || (typeof runRecord.decoding.top_p === "number" && Number.isFinite(runRecord.decoding.top_p) && runRecord.decoding.top_p >= 0 && runRecord.decoding.top_p <= 1))) {
      addError(errors, "invalid_range", "decoding.top_p", "Expected null or a number from 0 through 1");
    }
    if (!(runRecord.decoding.seed === null || Number.isInteger(runRecord.decoding.seed))) addError(errors, "wrong_type", "decoding.seed", "Expected null or an integer");
    if (!(runRecord.decoding.max_output_tokens === null || (Number.isInteger(runRecord.decoding.max_output_tokens) && runRecord.decoding.max_output_tokens >= 1))) {
      addError(errors, "invalid_range", "decoding.max_output_tokens", "Expected null or a positive integer");
    }
    for (const field of ["tools_enabled", "browsing_enabled", "retrieval_enabled"]) {
      if (runRecord.decoding[field] !== false) addError(errors, "capability_not_disabled", `decoding.${field}`, "Paper 1 requires false");
    }
    if (!RESPONSE_FORMATS.includes(runRecord.decoding.response_format)) addError(errors, "invalid_enum", "decoding.response_format", "Unknown response format");
  }

  if (!isNullableNonNegativeNumber(runRecord.latency_ms)) addError(errors, "invalid_range", "latency_ms", "Expected null or a non-negative finite number");
  for (const field of ["input_tokens", "output_tokens"]) {
    if (!isNullableNonNegativeInteger(runRecord[field])) addError(errors, "invalid_range", field, "Expected null or a non-negative integer");
  }

  let storedReportShapeValid = false;
  if (validateExactFields(runRecord.validation_report, VALIDATION_REPORT_FIELDS, "validation_report", errors)) {
    storedReportShapeValid = true;
    for (const field of ["schema_contract_valid", "substring_valid"]) {
      if (typeof runRecord.validation_report[field] !== "boolean") {
        storedReportShapeValid = false;
        addError(errors, "wrong_type", `validation_report.${field}`, "Expected a boolean");
      }
    }
    if (!Array.isArray(runRecord.validation_report.errors)) {
      storedReportShapeValid = false;
      addError(errors, "wrong_type", "validation_report.errors", "Expected an array");
    } else {
      runRecord.validation_report.errors.forEach((value, index) => validateStoredError(value, index, errors));
    }
  }

  const parseSucceeded = ["parsed_json", "repaired_json"].includes(runRecord.parse_status);
  if (parseSucceeded && !isPlainObject(runRecord.parsed_output)) addError(errors, "missing_parsed_output", "parsed_output", "Successful parse requires an object");
  if (!parseSucceeded && runRecord.parsed_output !== null) addError(errors, "unexpected_parsed_output", "parsed_output", "Failed parse/runtime requires null");
  if (!parseSucceeded && storedReportShapeValid && (runRecord.validation_report.schema_contract_valid || runRecord.validation_report.substring_valid)) {
    addError(errors, "invalid_failure_report", "validation_report", "Failed parse/runtime requires both validation booleans to be false");
  }

  if (runRecord.syntax_repair_applied === true) {
    if (runRecord.parse_status !== "repaired_json") addError(errors, "repair_status_mismatch", "parse_status", "Applied repair requires repaired_json");
    if (!isNonEmptyString(runRecord.syntax_repair_description)) addError(errors, "missing_repair_description", "syntax_repair_description", "Applied repair requires a description");
  } else if (runRecord.syntax_repair_description !== null) {
    addError(errors, "unexpected_repair_description", "syntax_repair_description", "No repair requires null");
  }
  if (runRecord.parse_status === "repaired_json" && runRecord.syntax_repair_applied !== true) {
    addError(errors, "repair_status_mismatch", "syntax_repair_applied", "repaired_json requires true");
  }

  if (runRecord.parse_status === "runtime_error") {
    if (!validateExactFields(runRecord.runtime_error, ["error_class", "message"], "runtime_error", errors)) {
      // Shape error is already recorded.
    } else {
      for (const field of ["error_class", "message"]) {
        if (!isNonEmptyString(runRecord.runtime_error[field])) addError(errors, "wrong_type", `runtime_error.${field}`, "Expected a non-empty string");
      }
    }
  } else if (runRecord.runtime_error !== null) {
    addError(errors, "unexpected_runtime_error", "runtime_error", "Only runtime_error status may contain an error object");
  }

  let sourceHashValid = false;
  if (typeof sourceText !== "string") {
    addError(errors, "invalid_source", "sourceText", "Source text must be supplied as a string");
  } else {
    sourceHashValid = sha256Utf8(sourceText) === runRecord.source_text_sha256;
    if (!sourceHashValid) addError(errors, "source_hash_mismatch", "source_text_sha256", "Stored hash does not match the supplied source text");
  }

  let promptHashValid = null;
  if (renderedPrompt === null) {
    warnings.push({ code: "prompt_hash_unverified", field: "prompt_sha256", message: "No rendered prompt was supplied" });
  } else if (typeof renderedPrompt !== "string") {
    addError(errors, "invalid_prompt", "renderedPrompt", "Rendered prompt must be a string or null");
    promptHashValid = false;
  } else {
    promptHashValid = sha256Utf8(renderedPrompt) === runRecord.prompt_sha256;
    if (!promptHashValid) addError(errors, "prompt_hash_mismatch", "prompt_sha256", "Stored hash does not match the supplied rendered prompt");
  }

  let modelOutputValidation = null;
  let storedValidationMatches = !parseSucceeded && storedReportShapeValid;
  if (parseSucceeded && isPlainObject(runRecord.parsed_output) && typeof sourceText === "string") {
    modelOutputValidation = validateModelOutput({ sourceText, output: runRecord.parsed_output });
    if (storedReportShapeValid) {
      const expected = {
        schema_contract_valid: modelOutputValidation.schema_contract_valid,
        substring_valid: modelOutputValidation.substring_valid,
        errors: modelOutputValidation.errors,
      };
      storedValidationMatches = JSON.stringify(runRecord.validation_report) === JSON.stringify(expected);
      if (!storedValidationMatches) addError(errors, "stored_validation_mismatch", "validation_report", "Stored report differs from deterministic recomputation");
    } else {
      storedValidationMatches = false;
    }
  }

  const metadataCodes = new Set([
    "source_hash_mismatch",
    "prompt_hash_mismatch",
    "invalid_source",
    "invalid_prompt",
    "stored_validation_mismatch",
  ]);
  const metadataValid = errors.every((error) => !metadataCodes.has(error.code)) && errors.length === 0;
  const valid = errors.length === 0;
  return {
    valid,
    fully_verified: valid && promptHashValid === true,
    metadata_valid: metadataValid,
    source_hash_valid: sourceHashValid,
    prompt_hash_valid: promptHashValid,
    stored_validation_matches: storedValidationMatches,
    model_output_validation: modelOutputValidation,
    errors,
    warnings,
  };
}

async function main() {
  const runPath = process.argv[2];
  const sourcePath = process.argv[3];
  const promptPath = process.argv[4];
  if (!runPath || !sourcePath) {
    throw new Error("Usage: node validate_run_record.mjs RUN_RECORD_JSON SOURCE_TEXT_FILE [RENDERED_PROMPT_FILE]");
  }
  const [runText, sourceText, renderedPrompt] = await Promise.all([
    fs.readFile(path.resolve(runPath), "utf8"),
    fs.readFile(path.resolve(sourcePath), "utf8"),
    promptPath ? fs.readFile(path.resolve(promptPath), "utf8") : Promise.resolve(null),
  ]);
  let runRecord;
  try {
    runRecord = JSON.parse(runText);
  } catch (error) {
    process.stdout.write(`${JSON.stringify({ valid: false, errors: [{ code: "invalid_json", field: "$", message: error.message }] }, null, 2)}\n`);
    process.exitCode = 1;
    return;
  }
  const report = validateRunRecord({ runRecord, sourceText, renderedPrompt });
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
