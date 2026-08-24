# Paper 1 scope lock

**Status:** Frozen design, 4 August 2026; sampling unit amended before annotation on 14 August 2026  
**Working title:** *Lost in Extraction: Native vs. English-Pivot LLM Conflict-Event Coding across Six Languages*

> **Amendment notice:** `MULTI_SOURCE_AND_COLLECTION_QA_AMENDMENT_v0.2.md` supersedes any news-oriented or single-genre implication in this file. The current unit is a bounded public security-related source item; source origin and delivery channel are separate metadata; collection QA is mandatory. The amendment does not change the RQs, sample cap, schema, conditions, models, run count, or Paper 1/Paper 2 split.

## 1. Core argument

This paper asks whether current LLMs can faithfully convert multilingual public security source items into a small, structured conflict-event record, and whether translating non-English sources to English before extraction helps or harms particular fields. The analysis is comparative and empirical: no language-resource gradient, pivot benefit, or Urdu/Pashto deficit is assumed in advance.

The distinctive intersection is:

- six languages, including naturally occurring standard-script Urdu and Pashto;
- the same item evaluated directly and through a preserved, fixed English translation;
- field-level event coding rather than document-level topic or event-presence classification alone;
- verbatim source evidence and explicit epistemic fields;
- direct measurement of unsupported outputs and claim-to-fact conversion.

Paper 1 diagnoses reliability. Gold-free failure detection, ensembles, risk scores, and verification ablations belong to Paper 2.

## 2. Research questions

### RQ1 — Extraction accuracy

How accurately do current LLMs identify and code conflict events from English, Turkish, Arabic, Persian, Urdu, and Pashto text?

Primary outcomes:

- event-presence precision, recall, and F1;
- macro-F1 and per-class F1 for event type;
- normalized precision, recall, and F1 for actor/side A, target/side B, location, and date.

### RQ2 — Language- and field-specific errors

How does performance vary across the six languages, and in which fields do errors concentrate?

Analyses include entity/role errors, event-type confusion, date and location errors, historical-event contamination, orthographic/transliteration failures, and epistemic errors. Language resource availability may be discussed as a possible explanation, not treated as an experimentally identified cause.

### RQ3 — Original-language versus English-pivot extraction

For which languages, models, event types, and fields does a fixed English-pivot improve or degrade extraction relative to direct extraction from the original-language text?

The primary estimand is the paired within-item difference between conditions. “Native” in the title means **direct extraction from the naturally occurring original-language input**; it does not describe the model or annotator.

### RQ4 — Source faithfulness and epistemic conversion

How often do model outputs contain events or slots unsupported by the original source, and how often do models convert claims, allegations, disputes, or denials into reported facts?

Primary outcomes:

- fabricated-event rate;
- unsupported-slot rate by field;
- percentage of predicted records containing at least one unsupported field;
- event claim-to-fact rate;
- actor-attribution claim-to-fact rate;
- claimant-to-actor collapse rate;
- translation-induced unsupported-output rate.

## 3. Benchmark design

### 3.1 Languages

1. English
2. Turkish
3. Arabic (Modern Standard Arabic)
4. Persian (variety recorded; Iranian Persian and Dari not silently merged)
5. Urdu (standard Perso-Arabic script; Roman Urdu excluded)
6. Pashto (variety recorded where identifiable)

The ordering above is organizational, not a causal resource ranking.

### 3.2 Items

- Final test set: **80 items per language; 480 items total**.
- Hard negatives: target **16 per language (20%)**.
- Pilot: **12 items per language**, excluded from the final test set.
- Double annotation: **16 final items per language (20%)**, stratified by event presence, type, source origin or channel, and epistemic status under the author-approved personnel plan.
- One bounded public source document, post, or passage is one item.
- Each positive item has one designated primary event.
- Items with no defensible primary event after the codebook tie-breakers are excluded from the main set and logged.

The final sample must avoid a language–source confound as far as practicable. Common source-balance targets are frozen after the archive-feasibility audit. Source origin, delivery channel, documented affiliation, region, language variety, writing-form flags, length, publication or post date, event cluster, and collection-QA status are recorded as item metadata.

### 3.3 Models

Three models:

- two frontier proprietary models from different providers;
- one strong open-weight multilingual model.

Exact model identifiers, versions/checkpoints, inference settings, access dates, context limits, and provider or runtime are frozen after the pilot. No model is selected because of observed final-test performance.

### 3.4 Conditions

For every non-English item and model:

1. **Original-language condition:** extraction directly from the naturally occurring source text.
2. **English-pivot condition:** a separate fixed translation system translates the source into English; that preserved translation is then given to the extraction model.

English items receive one English extraction condition. The evaluated extraction model is not asked to translate in either condition.

Main extraction-run count:

\[
(80 \times 5 \times 3 \times 2) + (80 \times 1 \times 3) = 2{,}640.
\]

The fixed translation system is selected and documented before final-test runs. All intermediate translations are retained.

### 3.5 Prompting

- One English-language task prompt and one JSON schema.
- Same definitions, field names, and decision rules in both conditions.
- Zero-shot only in Paper 1.
- Lowest available deterministic setting; tools, browsing, retrieval, and external knowledge disabled.
- Raw outputs are preserved.
- Only deterministic syntax repair is permitted; semantic repair is forbidden.

## 4. Lean event record

The model returns only:

1. `event_present`
2. `event_type`
3. `action_text`
4. `actor_or_side_a`
5. `target_or_side_b`
6. `location_text`
7. `date_text`
8. `event_assertion_status`
9. `actor_attribution_status`
10. `claimant`
11. `evidence_quote`

All text-bearing values use source-surface forms from the actual model input. No normalized location/date fields, provenance fields, character offsets, initiator field, reporting-source field, or secondary-event records are model outputs in Paper 1.

`claimant` is retained to support epistemic-error analysis. It is **not** an independently scored extraction slot with precision/recall/F1.

Evidence consists of one to three exact searchable substrings, not manually annotated character offsets. If the same substring occurs more than once, the quote includes enough surrounding text to identify the intended occurrence.

## 5. Event types

The flat typology contains seven substantive types plus a residual category:

1. `armed_clash`
2. `remote_or_explosive_violence`
3. `direct_attack_or_targeted_violence`
4. `arrest_detention_or_security_raid`
5. `abduction_or_disappearance`
6. `protest_or_violent_disorder`
7. `disrupted_or_foiled_attack`
8. `other_eligible_event`

This is ACLED-informed, not an assertion that it reproduces ACLED’s ontology or coding workflow. The flattening is deliberate because 80 items per language cannot support reliable claims across a large family/subtype hierarchy.

## 6. Pre-specified faithfulness definitions

- **Fabricated event:** the model returns `event_present=true` when the original-source gold record contains no eligible event.
- **Unsupported slot:** a non-null model field cannot be supported by the original source under the codebook’s permitted within-document inference rules.
- **Evidence-string validity:** every supplied quote is an exact substring of the input presented to that model, after newline normalization only.
- **Event claim-to-fact conversion:** gold `event_assertion_status` is `claimed_or_alleged`, `disputed`, or `denied`, while the model returns `reported_as_fact`.
- **Actor-attribution claim-to-fact conversion:** the analogous status change for `actor_attribution_status`.
- **Claimant-to-actor collapse:** a claimant that the original source does not identify as the event performer is output as actor/side A, while the gold actor differs or is unknown.
- **Translation-induced unsupported output:** a pivot output is licensed by wording in the preserved English translation but is absent from or unsupported by the original source. This is assessed with gold; the gold-free paired-discrepancy detector is reserved for Paper 2.

Source faithfulness is not real-world verification. A faithfully extracted claim can still be false.

## 7. Statistical commitments

- Report per-model, per-language, per-condition results.
- Treat original-versus-pivot comparisons as paired at item level.
- Use bootstrap confidence intervals clustered by item.
- Macro-average across languages where an overall result is reported.
- Distinguish conditional slot/type performance from end-to-end performance.
- Do not infer a universal language-resource law from six language observations.
- Do not interpret an English-pivot result as a property of translation in general; it is conditional on the frozen translation system.

## 8. Deferred to Paper 2

- gold-free paired original/pivot discrepancy flags;
- multi-model disagreement and consensus;
- deterministic verification checks and risk scores;
- analyst review-budget experiments;
- verification-stage ablations;
- controlled parallel-language challenge set;
- multi-event extraction;
- offsets and richer evidence alignment;
- normalized record schema and normalization provenance;
- few-shot prompting and prompt-strategy comparisons.

## 9. Remaining implementation choices—not scope invitations

These must be selected before the main experiment but do not change the research questions:

- exact three model versions;
- fixed translation system/version;
- temporal window and source-origin/delivery-channel balance targets;
- second annotators;
- deterministic text-normalization and slot-matching rules;
- repeat-run subset size, if retained as a robustness check;
- target venue and formatting.

Any proposed addition outside this list is presumed deferred unless it replaces, rather than adds to, an existing component.
