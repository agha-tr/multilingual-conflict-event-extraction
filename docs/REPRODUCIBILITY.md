# Reproducibility utilities

## Requirements

- Node.js 20 or later
- No third-party runtime packages for the included scripts and tests

## Run the tests

```bash
npm test
```

The tests use synthetic English fixtures and contain no conflict-source material.

## Render a prompt

Prepare an item JSON object with `item_id`, `input_condition`, `language`, `publication_date`, and `text`, then run:

```bash
node scripts/render_prompt.mjs ITEM.json
```

## Validate a model output

```bash
node scripts/validate_output.mjs SOURCE.txt OUTPUT.json
```

This validation checks the structural contract and whether required copied strings occur verbatim in the supplied model input after newline normalization. It does not establish semantic correctness or real-world truth.

## Validate a run record

```bash
node scripts/validate_run_record.mjs RUN_RECORD.json SOURCE.txt RENDERED_PROMPT.txt
```

## Structural evaluation

```bash
node scripts/evaluate_structural_metrics.mjs GOLD.jsonl RUNS.jsonl
```

The evaluator implements structural coverage, event-presence and event-type summaries, selected epistemic rates, and paired bootstrap scaffolding. Multilingual referent matching, evidence adequacy, claimant collapse, original-source support, and translation-induced error labels require a frozen human-reviewed comparison layer and are not claimed as complete here.
