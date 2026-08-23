# Public collection-design summary v0.2

## Sampling unit

The unit is one bounded public security-related source item in one target language. A source item may be an editorial article or passage, monitoring report, official statement, public organizational communication, civil-society publication, broadcast transcript, public social-media post, or public messaging-channel item when it can be retained and studied ethically.

The benchmark does not use the researcher's older mixed archive as its sampling frame. That archive was created for a different security-analysis purpose, contains Arabic working notes, may combine OSINT and HUMINT, and does not consistently preserve the bounded original source text needed for source-grounded evaluation.

## Public topic domains

The candidate-collection design uses public, broad conflict domains chosen for language relevance and separation from the researcher's sensitive archive topics:

| Language | Public topic domain |
| --- | --- |
| Urdu | Militant violence and counter-operations in Pakistan |
| Persian | Iranian armed opposition and state counter-operations |
| Turkish | Syrian armed and security conflict |
| Arabic | Sudan armed conflict |
| Pashto | Afghan anti-Taliban resistance and counter-operations |
| English | Russia-Ukraine war |

These domains organize retrieval. They are not labels supplied to extraction models, and they do not imply that all final items will describe the same actors, source types, or event distributions.

## Source diversity

Source origin and delivery channel are separate metadata. Source origins may include editorial media, state or government, armed organization, monitoring organization, civil society, individual or witness, other, and unclear. Delivery channels may include publisher websites, social media, public messaging platforms, documents or PDFs, broadcast transcripts, and other public channels.

Public availability is necessary but not sufficient. Private accounts, closed groups, circumvention, unlawfully obtained material, and content whose retention creates disproportionate privacy or operational risk are excluded.

## Collection-QA gate

Before annotation, each candidate must be reviewed for:

1. provenance and public-access status;
2. exact-text integrity and hashing;
3. language, variety, script, code mixing, and material orthographic variation;
4. publication or post date, retrieval date, and resurfacing risk;
5. sufficient contiguous context and a defensible primary-event boundary;
6. text-level and event-level duplication; and
7. copyright, privacy, sensitivity, dual-use, and release risk.

Collection QA may pass, hold, or exclude an item. It authenticates the captured source item and its metadata; it does not certify the source's account as true.

## Naturalistic writing

Model inputs preserve naturally occurring writing. Descriptive flags may record Urdu-associated character forms in Pashto, Turkish ASCII substitutions for diacritic-bearing letters, other cross-orthography mixing, and code mixing. The study does not create a normalized-input condition and makes no prevalence claim before the corpus is inspected.

## Materials withheld during active collection

The live source registry, exact acquisition queries, current candidate locators, captured source files, and collection outputs are not included in this methods snapshot. Their later disclosure will depend on protocol freeze, copyright, platform terms, privacy, source risk, and dual-use review.
