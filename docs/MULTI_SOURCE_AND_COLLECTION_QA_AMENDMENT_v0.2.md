# Paper 1 protocol amendment v0.2 — multi-source sampling and collection QA

**Paper:** *Lost in Extraction: Native vs. English-Pivot LLM Conflict-Event Coding across Six Languages*  
**Date adopted:** 14 August 2026  
**Status:** adopted before pilot annotation, translation, or model execution  
**Supersedes only:** the implicit or recommended news-only sampling rule in v0.1 working materials

## 1. Reason for the amendment

The target OSINT environment is not news-only. In Afghanistan, Pakistan, Iran, Kashmir, India, and related conflict settings, relevant public accounts may first or only be available through social media, public messaging channels, monitoring organizations, official statements, armed-organization media, local journalists, witnesses, or civil-society sources. Restricting the benchmark to edited news would remove a material part of the setting the study is intended to evaluate.

This amendment improves ecological validity without changing the paper's core scope. It does not assume that direct public posts are more truthful than news. Source origin, delivery channel, affiliation, and epistemic stance must remain explicit because editorial, state, armed-organization, and individual accounts can all contain error, strategic framing, propaganda, or contested claims.

## 2. Revised unit of collection

The unit is one **bounded public security-related source item** in a target language. Eligible items include:

- edited news or other editorial-media text;
- monitoring reports;
- public official or governmental statements;
- public statements or posts attributable to an armed organization;
- public civil-society material;
- public posts by identifiable or pseudonymous individuals, journalists, or witnesses when ethically retainable.

Private communications, closed groups, access-control circumvention, unlawfully obtained material, and items whose retention creates disproportionate privacy or operational-security risk remain excluded.

## 3. Source metadata

`source_origin` and `delivery_channel` are separate sampling variables.

`source_origin` uses:

- `editorial_media`
- `state_or_government`
- `armed_organization`
- `monitoring_organization`
- `civil_society`
- `individual_or_witness`
- `other`
- `unclear`

`delivery_channel` uses:

- `publisher_website`
- `social_media`
- `messaging_platform`
- `document_or_pdf`
- `broadcast_transcript`
- `other`

Documented ownership or affiliation is stored separately. Labels such as `pro_state` are not assigned from tone or political disagreement alone.

Additional sampling metadata include source account or publisher, locator, capture time, publication or post date, first-surfaced date when known, language and variety, geography, source-access status, event-cluster identifier, orthographic and code-mixing flags, collection-QA status, and provisional release tier. None is added to the lean 11-field model-output schema.

## 4. Collection-QA gate

Before annotation, each item must pass a documented review of:

1. provenance and public-access status;
2. exact-text integrity and hashing;
3. language, variety, script, code mixing, and material orthographic variation;
4. publication or post date, retrieval date, and resurfacing risk;
5. sufficient contiguous context and a defensible primary-event boundary;
6. text-level and event-level duplication;
7. copyright, privacy, sensitivity, dual-use, and release risk.

The permitted outcomes are `pass`, `hold`, and `exclude`, each with a reason code, reviewer, and date. Held or excluded items cannot enter annotation, translation, or model-run manifests. Collection QA authenticates and preserves the source item; it does not certify the source's claims as true.

## 5. Pilot treatment

The initial 72-item pilot manifest contained news items only. No independent annotation, pivot translation, or extraction-model execution had begun when this amendment was adopted. The pilot will therefore be rebalanced before use, while retaining:

- 12 items per language;
- nine intended positives and three intended hard negatives per language;
- the existing event-type and boundary-case coverage goals;
- a complete record of every retained, replaced, held, and excluded row.

The superseded manifest remains preserved as project history. Rebalancing does not increase pilot or main-study size.

## 6. Main-set balance

Before main-set selection, the author will audit the candidate archive and freeze common, feasible source-origin and delivery-channel targets for all six languages. The targets must guarantee meaningful representation of both editorial material and direct public social-media material while respecting the 80-items-per-language cap. Deviations, source concentration, and sparse strata will be reported. Source-stratified performance is exploratory and cannot be interpreted causally.

## 7. Naturalistic writing

Naturalistic spelling and character usage are preserved in model input. Collection metadata flag, where observed:

- Urdu-associated code points or letter forms in Pashto items;
- Turkish ASCII substitution for diacritic-bearing letters;
- other cross-orthography character mixing;
- code mixing and material nonstandard writing.

These flags support descriptive error analysis. They do not create a normalized-input condition, and no prevalence claim is made before the corpus is inspected.

## 8. Elements unchanged

The amendment does not change:

- the four research questions;
- six languages and 80 main items per language;
- the 64-positive and 16-hard-negative collection targets;
- the flat event typology;
- the lean 11-field extraction schema;
- original-language versus fixed English-pivot conditions;
- three extraction models and 2,640 canonical runs;
- evidence-required source-faithfulness evaluation;
- claim-to-fact and claimant-to-actor analyses;
- the boundary between Paper 1 and the gold-free verification study in Paper 2.

## 9. Source-truth boundary

Gold annotation represents what one bounded item states. It does not resolve competing accounts about initiation, casualty identity, civilian or combatant status, responsibility, or event truth. Unsupported model content is measured relative to the supplied source. Cross-source corroboration and real-world factual adjudication are outside Paper 1.

