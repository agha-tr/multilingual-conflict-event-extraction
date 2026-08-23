#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EVENT_TYPES, EVENT_STATUSES, ACTOR_STATUSES } from "./validate_output.mjs";
import { LANGUAGES, INPUT_CONDITIONS, PARSE_STATUSES } from "./validate_run_record.mjs";

const WEAK_STATUSES = new Set(["claimed_or_alleged", "disputed", "denied"]);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const safeDivide = (numerator, denominator) => (denominator === 0 ? null : numerator / denominator);
const f1FromCounts = (tp, fp, fn) => {
  const denominator = (2 * tp) + fp + fn;
  return denominator === 0 ? null : (2 * tp) / denominator;
};
const mean = (values) => (values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseJsonl(text, label) {
  const rows = [];
  const lines = text.split(/\r?\n/u);
  lines.forEach((line, index) => {
    if (line.trim() === "") return;
    try {
      rows.push(JSON.parse(line));
    } catch (error) {
      throw new Error(`${label} line ${index + 1}: invalid JSON: ${error.message}`);
    }
  });
  return rows;
}

function validateGoldRows(goldRows) {
  const byItem = new Map();
  for (const [index, row] of goldRows.entries()) {
    const prefix = `Gold row ${index + 1}`;
    assert(isPlainObject(row), `${prefix}: expected an object`);
    assert(typeof row.item_id === "string" && row.item_id.length > 0, `${prefix}: item_id must be a non-empty string`);
    assert(LANGUAGES.includes(row.language), `${prefix}: invalid language`);
    assert(!byItem.has(row.item_id), `${prefix}: duplicate item_id ${row.item_id}`);
    assert(isPlainObject(row.gold), `${prefix}: gold must be an object`);
    assert(typeof row.gold.event_present === "boolean", `${prefix}: gold.event_present must be boolean`);
    if (row.gold.event_present) {
      assert(EVENT_TYPES.includes(row.gold.event_type), `${prefix}: invalid positive gold.event_type`);
      assert(EVENT_STATUSES.slice(0, 4).includes(row.gold.event_assertion_status), `${prefix}: invalid positive gold.event_assertion_status`);
      assert(ACTOR_STATUSES.slice(0, 5).includes(row.gold.actor_attribution_status), `${prefix}: invalid positive gold.actor_attribution_status`);
    } else {
      assert(row.gold.event_type === null, `${prefix}: negative gold.event_type must be null`);
      assert(row.gold.event_assertion_status === "not_applicable", `${prefix}: negative gold.event_assertion_status must be not_applicable`);
      assert(row.gold.actor_attribution_status === "not_applicable", `${prefix}: negative gold.actor_attribution_status must be not_applicable`);
    }
    byItem.set(row.item_id, row);
  }
  return byItem;
}

function modelKey(run) {
  return `${run.model_provider}::${run.model_id}::${run.model_version ?? "unspecified"}`;
}

function validateAndJoinRuns(runRows, goldByItem) {
  const joined = [];
  const seenCells = new Set();
  for (const [index, run] of runRows.entries()) {
    const prefix = `Run row ${index + 1}`;
    assert(isPlainObject(run), `${prefix}: expected an object`);
    for (const field of ["run_id", "item_id", "model_provider", "model_id"]) {
      assert(typeof run[field] === "string" && run[field].length > 0, `${prefix}: ${field} must be a non-empty string`);
    }
    assert(LANGUAGES.includes(run.language), `${prefix}: invalid language`);
    assert(INPUT_CONDITIONS.includes(run.input_condition), `${prefix}: invalid input_condition`);
    assert(PARSE_STATUSES.includes(run.parse_status), `${prefix}: invalid parse_status`);
    assert(isPlainObject(run.validation_report), `${prefix}: validation_report must be an object`);
    assert(typeof run.validation_report.schema_contract_valid === "boolean", `${prefix}: schema_contract_valid must be boolean`);
    assert(typeof run.validation_report.substring_valid === "boolean", `${prefix}: substring_valid must be boolean`);
    const goldRow = goldByItem.get(run.item_id);
    assert(goldRow, `${prefix}: item_id ${run.item_id} is absent from gold`);
    assert(goldRow.language === run.language, `${prefix}: language does not match gold for ${run.item_id}`);
    const cell = `${run.item_id}\u0000${modelKey(run)}\u0000${run.input_condition}`;
    assert(!seenCells.has(cell), `${prefix}: duplicate analysis cell for ${run.item_id}, ${modelKey(run)}, ${run.input_condition}`);
    seenCells.add(cell);
    joined.push({ run, gold: goldRow.gold, language: run.language, model_key: modelKey(run) });
  }
  return joined;
}

function structurallyUsable(row) {
  const { run } = row;
  if (!["parsed_json", "repaired_json"].includes(run.parse_status)) return false;
  if (!isPlainObject(run.parsed_output) || run.validation_report.schema_contract_valid !== true) return false;
  const output = run.parsed_output;
  if (typeof output.event_present !== "boolean") return false;
  if (!output.event_present) return output.event_type === null;
  return EVENT_TYPES.includes(output.event_type)
    && EVENT_STATUSES.slice(0, 4).includes(output.event_assertion_status)
    && ACTOR_STATUSES.slice(0, 5).includes(output.actor_attribution_status);
}

function coverageSummary(rows) {
  let parseSuccess = 0;
  let schemaValid = 0;
  let substringValid = 0;
  let repaired = 0;
  let invalidJson = 0;
  let runtimeError = 0;
  let structurallyInvalid = 0;
  let substringInvalidAmongSchemaValid = 0;
  for (const row of rows) {
    const { run } = row;
    const parsed = ["parsed_json", "repaired_json"].includes(run.parse_status);
    if (parsed) parseSuccess += 1;
    if (run.parse_status === "repaired_json") repaired += 1;
    if (run.parse_status === "invalid_json") invalidJson += 1;
    if (run.parse_status === "runtime_error") runtimeError += 1;
    if (parsed && run.validation_report.schema_contract_valid === true) {
      schemaValid += 1;
      if (run.validation_report.substring_valid === true) substringValid += 1;
      else substringInvalidAmongSchemaValid += 1;
    } else if (parsed) {
      structurallyInvalid += 1;
    }
  }
  return {
    total_runs: rows.length,
    parse_success: { count: parseSuccess, rate: safeDivide(parseSuccess, rows.length) },
    schema_contract_valid: { count: schemaValid, rate: safeDivide(schemaValid, rows.length) },
    substring_valid: { count: substringValid, rate: safeDivide(substringValid, rows.length) },
    syntax_repaired: { count: repaired, rate: safeDivide(repaired, rows.length) },
    invalid_json: invalidJson,
    runtime_error: runtimeError,
    structurally_invalid_parsed_output: structurallyInvalid,
    substring_invalid_among_schema_valid: substringInvalidAmongSchemaValid,
  };
}

function presenceSummary(rows) {
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let invalidOnGoldNegative = 0;
  let goldPositive = 0;
  let goldNegative = 0;
  for (const row of rows) {
    const goldValue = row.gold.event_present;
    if (goldValue) goldPositive += 1;
    else goldNegative += 1;
    if (!structurallyUsable(row)) {
      if (goldValue) fn += 1;
      else invalidOnGoldNegative += 1;
      continue;
    }
    const predicted = row.run.parsed_output.event_present;
    if (goldValue && predicted) tp += 1;
    else if (!goldValue && predicted) fp += 1;
    else if (!goldValue && !predicted) tn += 1;
    else fn += 1;
  }
  return {
    gold_positive: goldPositive,
    gold_negative: goldNegative,
    tp,
    fp,
    tn,
    fn,
    invalid_on_gold_negative: invalidOnGoldNegative,
    precision: safeDivide(tp, tp + fp),
    recall: safeDivide(tp, tp + fn),
    f1: f1FromCounts(tp, fp, fn),
    end_to_end_accuracy: safeDivide(tp + tn, rows.length),
    fabricated_event_rate: safeDivide(fp, goldNegative),
  };
}

function classificationSummary(rows, { conditional = false } = {}) {
  const evaluationRows = conditional
    ? rows.filter((row) => row.gold.event_present && structurallyUsable(row) && row.run.parsed_output.event_present)
    : rows;
  const perClass = {};
  for (const label of EVENT_TYPES) {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let support = 0;
    let predictions = 0;
    for (const row of evaluationRows) {
      const goldLabel = row.gold.event_present ? row.gold.event_type : null;
      const predictedLabel = structurallyUsable(row) && row.run.parsed_output.event_present
        ? row.run.parsed_output.event_type
        : null;
      if (goldLabel === label) support += 1;
      if (predictedLabel === label) predictions += 1;
      if (goldLabel === label && predictedLabel === label) tp += 1;
      else {
        if (predictedLabel === label) fp += 1;
        if (goldLabel === label) fn += 1;
      }
    }
    perClass[label] = {
      support,
      predictions,
      tp,
      fp,
      fn,
      precision: safeDivide(tp, tp + fp),
      recall: safeDivide(tp, tp + fn),
      f1: f1FromCounts(tp, fp, fn),
    };
  }
  const definedF1 = Object.values(perClass).map((value) => value.f1).filter((value) => value !== null);
  let correctPositive = 0;
  let exactLabelCorrect = 0;
  for (const row of evaluationRows) {
    const goldLabel = row.gold.event_present ? row.gold.event_type : null;
    const predictedLabel = structurallyUsable(row) && row.run.parsed_output.event_present
      ? row.run.parsed_output.event_type
      : null;
    if (goldLabel !== null && goldLabel === predictedLabel) correctPositive += 1;
    if (structurallyUsable(row)) {
      const exactMatch = row.gold.event_present
        ? row.run.parsed_output.event_present && predictedLabel === goldLabel
        : row.run.parsed_output.event_present === false;
      if (exactMatch) exactLabelCorrect += 1;
    }
  }
  const goldPositiveCount = evaluationRows.filter((row) => row.gold.event_present).length;
  return {
    evaluation_rows: evaluationRows.length,
    gold_positive_rows: goldPositiveCount,
    correct_positive_type: correctPositive,
    exact_event_label_accuracy_all_rows: safeDivide(exactLabelCorrect, evaluationRows.length),
    accuracy_on_gold_positive_rows: safeDivide(correctPositive, goldPositiveCount),
    macro_f1: mean(definedF1),
    macro_f1_defined_classes: definedF1.length,
    per_class: perClass,
  };
}

function claimToFactSummary(rows, goldField, predictedField) {
  const eligible = rows.filter((row) => row.gold.event_present && WEAK_STATUSES.has(row.gold[goldField]));
  const conditional = eligible.filter((row) => structurallyUsable(row) && row.run.parsed_output.event_present);
  const isConversion = (row) => row.run.parsed_output[predictedField] === "reported_as_fact";
  const endToEndConversions = eligible.filter((row) => structurallyUsable(row) && row.run.parsed_output.event_present && isConversion(row)).length;
  const conditionalConversions = conditional.filter(isConversion).length;
  return {
    eligible_gold_cases: eligible.length,
    end_to_end: {
      conversions: endToEndConversions,
      denominator: eligible.length,
      rate: safeDivide(endToEndConversions, eligible.length),
    },
    conditional_on_valid_positive_prediction: {
      conversions: conditionalConversions,
      denominator: conditional.length,
      rate: safeDivide(conditionalConversions, conditional.length),
    },
  };
}

function groupRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = `${row.language}\u0000${row.model_key}\u0000${row.run.input_condition}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, values]) => values);
}

function summarizeGroup(rows) {
  const first = rows[0];
  return {
    language: first.language,
    model_provider: first.run.model_provider,
    model_id: first.run.model_id,
    model_version: first.run.model_version,
    input_condition: first.run.input_condition,
    coverage: coverageSummary(rows),
    event_presence: presenceSummary(rows),
    event_type: {
      end_to_end: classificationSummary(rows),
      conditional_on_gold_and_predicted_event: classificationSummary(rows, { conditional: true }),
    },
    claim_to_fact: {
      event_assertion: claimToFactSummary(rows, "event_assertion_status", "event_assertion_status"),
      actor_attribution: claimToFactSummary(rows, "actor_attribution_status", "actor_attribution_status"),
    },
  };
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sortedValues, probability) {
  if (sortedValues.length === 0) return null;
  const index = (sortedValues.length - 1) * probability;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const fraction = index - lower;
  return sortedValues[lower] + ((sortedValues[upper] - sortedValues[lower]) * fraction);
}

function pairedBootstrap(values, repetitions, random) {
  if (values.length === 0 || repetitions === 0) return null;
  const estimates = [];
  for (let repetition = 0; repetition < repetitions; repetition += 1) {
    let sum = 0;
    for (let index = 0; index < values.length; index += 1) {
      const selected = values[Math.floor(random() * values.length)];
      sum += selected.pivot - selected.original;
    }
    estimates.push(sum / values.length);
  }
  estimates.sort((a, b) => a - b);
  return {
    method: "paired percentile bootstrap clustered by item_id",
    repetitions,
    confidence_level: 0.95,
    lower: percentile(estimates, 0.025),
    upper: percentile(estimates, 0.975),
  };
}

function pairedMetric(values, repetitions, random) {
  let wins = 0;
  let ties = 0;
  let losses = 0;
  for (const value of values) {
    if (value.pivot > value.original) wins += 1;
    else if (value.pivot < value.original) losses += 1;
    else ties += 1;
  }
  const originalValues = values.map((value) => value.original);
  const pivotValues = values.map((value) => value.pivot);
  const originalMean = mean(originalValues);
  const pivotMean = mean(pivotValues);
  return {
    paired_items: values.length,
    original_mean: originalMean,
    pivot_mean: pivotMean,
    pivot_minus_original: originalMean === null ? null : pivotMean - originalMean,
    pivot_wins: wins,
    ties,
    pivot_losses: losses,
    confidence_interval: pairedBootstrap(values, repetitions, random),
  };
}

function pairedSummaries(rows, repetitions, seed) {
  const cells = new Map();
  for (const row of rows) {
    if (row.language === "English" || !["original_language", "english_pivot"].includes(row.run.input_condition)) continue;
    const key = `${row.language}\u0000${row.model_key}\u0000${row.run.item_id}`;
    if (!cells.has(key)) cells.set(key, { language: row.language, model_key: row.model_key, item_id: row.run.item_id, gold: row.gold });
    cells.get(key)[row.run.input_condition] = row;
  }
  const groups = new Map();
  for (const cell of cells.values()) {
    const key = `${cell.language}\u0000${cell.model_key}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(cell);
  }
  const random = mulberry32(seed);
  const results = [];
  for (const [, cellsInGroup] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const paired = cellsInGroup.filter((cell) => cell.original_language && cell.english_pivot);
    const originalOnly = cellsInGroup.filter((cell) => cell.original_language && !cell.english_pivot).length;
    const pivotOnly = cellsInGroup.filter((cell) => !cell.original_language && cell.english_pivot).length;
    if (cellsInGroup.length === 0) continue;
    const representative = (paired[0]?.original_language ?? cellsInGroup[0].original_language ?? cellsInGroup[0].english_pivot).run;
    const presenceValues = paired.map((cell) => ({
      original: structurallyUsable(cell.original_language) && cell.original_language.run.parsed_output.event_present === cell.gold.event_present ? 1 : 0,
      pivot: structurallyUsable(cell.english_pivot) && cell.english_pivot.run.parsed_output.event_present === cell.gold.event_present ? 1 : 0,
    }));
    const typeValues = paired.filter((cell) => cell.gold.event_present).map((cell) => ({
      original: structurallyUsable(cell.original_language)
        && cell.original_language.run.parsed_output.event_present
        && cell.original_language.run.parsed_output.event_type === cell.gold.event_type ? 1 : 0,
      pivot: structurallyUsable(cell.english_pivot)
        && cell.english_pivot.run.parsed_output.event_present
        && cell.english_pivot.run.parsed_output.event_type === cell.gold.event_type ? 1 : 0,
    }));
    results.push({
      language: cellsInGroup[0].language,
      model_provider: representative.model_provider,
      model_id: representative.model_id,
      model_version: representative.model_version,
      available_cells: cellsInGroup.length,
      complete_pairs: paired.length,
      unmatched_original_only: originalOnly,
      unmatched_pivot_only: pivotOnly,
      event_presence_correctness: pairedMetric(presenceValues, repetitions, random),
      event_type_correctness_on_gold_positive: pairedMetric(typeValues, repetitions, random),
    });
  }
  return results;
}

function parseOptions(args) {
  let bootstrap = 2000;
  let seed = 20260804;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--bootstrap") {
      bootstrap = Number(args[index + 1]);
      index += 1;
    } else if (args[index] === "--seed") {
      seed = Number(args[index + 1]);
      index += 1;
    } else {
      throw new Error(`Unknown option: ${args[index]}`);
    }
  }
  assert(Number.isInteger(bootstrap) && bootstrap >= 0, "--bootstrap must be a non-negative integer");
  assert(Number.isInteger(seed), "--seed must be an integer");
  return { bootstrap, seed };
}

export function evaluateStructuralMetrics({ goldRows, runRows, bootstrap = 2000, seed = 20260804 }) {
  assert(Number.isInteger(bootstrap) && bootstrap >= 0, "bootstrap must be a non-negative integer");
  assert(Number.isInteger(seed), "seed must be an integer");
  const goldByItem = validateGoldRows(goldRows);
  const joined = validateAndJoinRuns(runRows, goldByItem);
  const evaluatedItemIds = new Set(joined.map((row) => row.run.item_id));
  const notComputed = {
    normalized_actor_or_side_a: "Awaiting frozen normalization and slot-matching rules.",
    normalized_target_or_side_b: "Awaiting frozen normalization and slot-matching rules.",
    normalized_location: "Awaiting frozen normalization and slot-matching rules.",
    normalized_date: "Awaiting frozen normalization and slot-matching rules.",
    unsupported_slot_and_any_unsupported_field: "Requires adjudicated semantic support labels against the original source.",
    claimant_to_actor_collapse: "Requires a gold role comparison and human-supported claimant/actor distinction.",
    translation_induced_unsupported_output: "Requires comparison of the pivot wording and output with adjudicated original-source support.",
  };
  return {
    scaffold_version: "pilot-v0.1",
    generated_at_utc: new Date().toISOString(),
    inputs: {
      gold_items: goldRows.length,
      run_records: runRows.length,
      gold_items_with_at_least_one_run: evaluatedItemIds.size,
      gold_items_without_runs: goldRows.length - evaluatedItemIds.size,
    },
    bootstrap: {
      repetitions: bootstrap,
      seed,
      cluster_unit: "item_id",
      interval: "paired percentile, 95%",
    },
    groups: groupRows(joined).map(summarizeGroup),
    paired_original_vs_pivot: pairedSummaries(joined, bootstrap, seed),
    not_computed: notComputed,
    interpretation_limits: [
      "This report contains structural metrics only and does not establish semantic source support.",
      "Substring validity checks instruction compliance against the model input, not faithfulness to the original source in the pivot condition.",
      "No language-resource gradient or general translation effect is identified by these descriptive results alone."
    ],
  };
}

async function main() {
  const goldPath = process.argv[2];
  const runsPath = process.argv[3];
  if (!goldPath || !runsPath) {
    throw new Error("Usage: node evaluate_structural_metrics.mjs GOLD_JSONL RUNS_JSONL [--bootstrap N] [--seed INTEGER]");
  }
  const options = parseOptions(process.argv.slice(4));
  const [goldText, runsText] = await Promise.all([
    fs.readFile(path.resolve(goldPath), "utf8"),
    fs.readFile(path.resolve(runsPath), "utf8"),
  ]);
  const report = evaluateStructuralMetrics({
    goldRows: parseJsonl(goldText, "Gold"),
    runRows: parseJsonl(runsText, "Runs"),
    ...options,
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  });
}
