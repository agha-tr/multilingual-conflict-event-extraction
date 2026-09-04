# Lost in Extraction

## Native vs. English-Pivot LLM Conflict-Event Coding across Six Languages

**Public methods snapshot:** v0.2.1, 2026-09-04  
**Status:** Research in progress; no main-study results; not peer-reviewed  
**Repository:** [github.com/agha-tr/multilingual-conflict-event-extraction](https://github.com/agha-tr/multilingual-conflict-event-extraction)  
**OSF Project:** [osf.io/nc5u7](https://osf.io/nc5u7/)  
**Project DOI:** [10.17605/OSF.IO/NC5U7](https://doi.org/10.17605/OSF.IO/NC5U7)  
**Registration:** Editable OSF Project; formal preregistration pending post-pilot protocol freeze

This project studies whether large language models can faithfully convert multilingual public security texts into compact conflict-event records. It compares extraction directly from naturally occurring original-language text with extraction from a fixed English translation for English, Turkish, Modern Standard Arabic, Persian, standard-script Urdu, and Pashto.

The project focuses on field-level reliability, source support, and epistemic preservation. A model can produce plausible output while reversing actor and target roles, inventing a date or location, or converting a claim, allegation, dispute, or denial into an unqualified fact. These failures matter in conflict monitoring, especially where important reporting is multilingual and public social media may supplement or replace tightly constrained editorial coverage.

## Research questions

1. How accurately do current LLMs identify and code conflict events across the six languages?
2. How does performance vary by language and field, and where do errors concentrate?
3. For which languages, models, event types, and fields does a fixed English pivot improve or degrade extraction relative to direct extraction from the original-language text?
4. How often do outputs contain events or fields unsupported by the original source, and how often do models convert claims, allegations, disputes, or denials into facts?

## Scope-locked Paper 1 design

| Element | Current commitment |
| --- | --- |
| Languages | English, Turkish, Modern Standard Arabic, Persian, standard-script Urdu, Pashto |
| Final test set | 80 items per language; 480 total |
| Hard negatives | Target 16 per language |
| Models | Two frontier proprietary models from different providers and one open-weight multilingual model |
| Conditions | Original-language and fixed English-pivot for five non-English languages; English control |
| Planned canonical extraction runs | 2,640 |
| Prompting | Zero-shot; one source-neutral task prompt; structured JSON output; tools and retrieval disabled |
| Event target | One primary event or one negative record |
| Event types | Seven substantive types plus a residual eligible-event type |
| Evidence | One to three exact searchable source substrings |

“Native” means direct extraction from the naturally occurring original-language input. It does not describe the model or annotator. “Faithfulness” means support in the supplied source, not independent confirmation that an event occurred in the world.

## Not a news-only benchmark

The sampling unit is one bounded, public, security-related source item. Eligible material may include editorial reporting, monitoring reports, public official statements, public organizational communications, civil-society material, and ethically retainable public social-media posts. Private communications, closed groups, access-control circumvention, and material drawn from the researcher's older mixed OSINT/HUMINT archive are outside the benchmark sampling frame.

Every candidate must pass collection QA covering provenance, public-access status, exact-text integrity, language and script, publication date, sufficient context, duplication, privacy, copyright, sensitivity, and dual-use risk before annotation or model execution.

## Why Urdu and Pashto matter

Urdu and Pashto are central to the information environments surrounding conflict and counter-operation reporting in Pakistan and Afghanistan, yet they are often absent from multilingual event-extraction evaluations. The study treats naturalistic spelling, cross-orthography forms, and code mixing as empirical properties to document, not as deficiencies in the languages or their users.

## Repository map

- `docs/` — scope, project status, collection design, preregistration status, ethics, release boundary, and reproducibility notes.
- `codebook/` — pilot annotation codebook.
- `prompts/` — source-neutral pilot extraction prompt.
- `schemas/` — lean model-output and run-record JSON Schemas.
- `scripts/` — deterministic prompt rendering, output validation, run-record validation, and structural metric utilities.
- `tests/` — synthetic contract and evaluator tests. No conflict-source text is included.

## Current release boundary

This snapshot contains methods and synthetic tests only. It does not contain source texts, screenshots, audio, video, source registries, live acquisition queries, candidate pools, annotation workbooks, translations, model outputs, provider logs, results, private archive material, or credentials. See `docs/PUBLIC_RELEASE_BOUNDARY_v0.2.md` and `docs/ETHICS_AND_DATA_RELEASE_POLICY_v0.2.md`.

## Reproducibility utilities

The included utilities use Node.js and have no third-party runtime dependencies.


```bash
npm test
```

The current evaluator covers structural validity, exact-substring checks, event presence, event type, selected epistemic rates, and paired bootstrap scaffolding. Multilingual referent matching and original-source support judgments remain human-reviewed components and are not represented as complete in this release.

## Preregistration and versioning

The editable OSF Project and this repository document development. They do not, by themselves, constitute preregistration. The formal registration will follow the excluded annotation pilot and promotion of the codebook, schema, prompt, sampling procedure, model specification, translation system, evaluation rules, and ethics plan to their frozen versions. Material changes are recorded in `CHANGELOG.md`.

## Citation

Machine-readable citation metadata is provided in `CITATION.cff`. Cite the public OSF Project using DOI [10.17605/OSF.IO/NC5U7](https://doi.org/10.17605/OSF.IO/NC5U7) and cite the versioned GitHub release when referring to a specific methods snapshot. The DOI identifies the editable project; the release tag identifies the exact repository version. The citation metadata identifies Ahmad Agha ([ORCID 0009-0007-1431-9409](https://orcid.org/0009-0007-1431-9409)) as the project author.

## Licenses

- Scripts, tests, and JSON Schemas: Apache License 2.0, unless a file states otherwise.
- Original documentation, codebook, and prompt: Creative Commons Attribution 4.0 International.
- Source data: not included and not licensed by this repository.

## Responsible-use statement

This is a research evaluation package, not a real-time monitoring system, verification service, targeting aid, or certification that any model is safe for autonomous conflict-event coding.
