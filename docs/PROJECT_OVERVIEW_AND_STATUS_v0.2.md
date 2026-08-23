# Project overview and status v0.2

**Project:** *Lost in Extraction: Native vs. English-Pivot LLM Conflict-Event Coding across Six Languages*  
**Snapshot date:** 2026-08-23  
**Status:** Public methods snapshot; research in progress; no main-study results

## Purpose

Paper 1 evaluates multilingual conflict-event extraction and the effect of a fixed English-pivot route. Paper 2 is reserved for gold-free failure flagging, multi-model disagreement, risk scores, and human-review prioritization.

## Current commitments

- Six languages and 80 final items per language.
- One bounded public source item per benchmark item.
- A multi-source design with no news-only rule.
- One primary event or one negative record.
- A lean 11-field, evidence-required model output.
- Three extraction models and paired original-language versus English-pivot evaluation for the five non-English languages.
- Direct measurement of unsupported output, claim-to-fact conversion, and claimant-to-actor collapse.
- Collection QA before annotation, translation, or model execution.

## Checkpoint at this release

- The Paper 1 scope and four research questions are locked.
- The source-neutral sampling amendment and collection-QA gate have been adopted.
- Pilot codebook and extraction prompt are at v0.2; the lean model-output and run-record schemas are pilot v0.1.
- Deterministic prompt, output, run-record, and structural-evaluation utilities pass synthetic tests.
- Retrieval and collector engineering have been tested internally, but those live acquisition materials are not part of this public release.
- Candidate acquisition is in progress. No candidate is a benchmark item until collection QA and sampling decisions are completed.
- No final gold annotation, canonical extraction run, result, or performance claim is included.

## Decisions still required before formal preregistration

- final temporal window and common source-origin/channel targets;
- final annotation-pilot adjudication and instrument changes;
- exact model identifiers, versions, and inference settings;
- fixed English translation system and translation-preservation rules;
- multilingual referent, date, location, and source-support matching rules;
- final data-management, institutional-review, retention, and release decisions;
- final contributor, funding, and conflict-of-interest statements.

## Public status statement

> Research in progress. Formal preregistration is pending post-pilot protocol freeze. No main-study results are reported.
