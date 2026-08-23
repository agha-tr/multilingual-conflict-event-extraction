# Public evaluation plan, pilot v0.2

## Outcome families

The evaluation separates output usability, event selection, field extraction, source support, epistemic preservation, and paired original-versus-pivot effects.

### Structural coverage

- parse success;
- schema-contract validity;
- exact-substring validity; and
- valid-output coverage retained in end-to-end denominators.

### Event presence and type

- precision, recall, F1, and end-to-end accuracy for event presence;
- fabricated-event rate on gold negatives;
- per-class precision, recall, and F1;
- macro-F1 with support counts; and
- event-type confusion matrices.

### Entity, location, and date fields

Actor or side A, target or side B, location, and date are evaluated with a frozen item-local matching layer. Results distinguish exact source-form recovery, normalized referent matching, conditional performance given a valid predicted event, and end-to-end performance.

### Faithfulness and epistemic conversion

- unsupported-slot rate by field;
- share of predicted records containing at least one unsupported field;
- event and actor-attribution claim-to-fact conversion;
- claimant-to-actor collapse; and
- translation-induced unsupported output.

Source support is assessed against the bounded original source. It is not a judgment of real-world truth.

## Paired analysis

Original-language and English-pivot records are paired within item and model. English is excluded from pivot comparisons. Primary reporting includes original and pivot estimates, pivot-minus-original differences, wins/ties/losses for binary correctness, and item-clustered paired percentile-bootstrap intervals. The planned bootstrap uses 2,000 repetitions and seed `20260804` unless a pre-registered replacement is adopted before outcome inspection.

## Reporting

- report exact model version, language, and condition;
- preserve raw denominators and invalid-run counts;
- macro-average languages rather than allowing unequal valid-output counts to dominate;
- distinguish primary from conditional metrics;
- avoid interpreting six languages as a causal resource hierarchy; and
- avoid generalizing from one frozen translation system to English pivoting as a class.

## Incomplete human-judgment layer

The matching and source-support protocol, reviewer blinding, reliability audit, and adjudication rules must be frozen before semantic review of final model outputs. This public snapshot does not claim that those judgments have been completed.
