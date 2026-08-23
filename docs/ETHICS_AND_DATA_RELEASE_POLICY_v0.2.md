# Ethics and data-release policy v0.2

## Research boundary

The project evaluates the reliability of multilingual event extraction. It is not designed to identify targets, support live operations, resolve disputed claims, or publish operationally useful intelligence. Source-grounded annotation represents what one bounded source states, including its claims, allegations, disputes, and denials. It does not establish real-world truth.

## Main risks

- dual use of extraction and aggregation methods;
- exposure of vulnerable speakers, victims, witnesses, detainees, or alleged perpetrators;
- amplification of propaganda or contested accusations;
- copyright, database-right, and platform-term constraints;
- distressing or graphic conflict content;
- provider retention, privacy, jurisdiction, and data-use concerns; and
- re-identification of language specialists or contributors.

## Safeguards

- collect only bounded public text and metadata required for the analysis;
- exclude private communications, closed groups, circumvention, and non-public intelligence;
- preserve epistemic status and claimant information rather than converting allegations into research assertions;
- minimize unnecessary personal identifiers and precise operational detail;
- prefer text-only annotation where images or video add exposure without scientific necessity;
- separate working locators, annotations, and contributor records from public outputs;
- transmit only bounded public passages and necessary prompt metadata to hosted systems;
- never transmit private archive context, gold records, analyst notes, or personal contact information to evaluated systems;
- publish aggregate performance and sanitized examples rather than a live tactical catalog; and
- require item-level copyright, privacy, sensitivity, and dual-use review before any data release.

## Release tiers

### Public methods

Protocol documentation, codebook, prompts, schemas, deterministic code, synthetic tests, aggregate findings, and carefully sanitized examples may be public.

### Conditional or controlled access

Short excerpts, source locators, annotations, translations, and model outputs may be shared only when copyright, platform terms, privacy, sensitivity, and contributor review permit. Any access process must state permitted uses, citation duties, onward-disclosure limits, and deletion requirements.

### Withheld

Full copyrighted articles, private archive contents, deleted or restricted posts, unnecessary personal data, graphic media, live source-selection logic, operationally enriched coordinates, credentials, private logs, and material whose redistribution could materially facilitate harm remain withheld.

## Current release decision

Public snapshot v0.2 contains methods, schemas, a pilot prompt and codebook, deterministic utilities, synthetic tests, and project documentation. It contains no source material, source registry, candidate archive, annotation workbook, translation, model output, or study result.

## Takedown and correction

Anyone who identifies accidental disclosure of sensitive, personal, copyrighted, or operationally risky material should use a private contact channel associated with the repository owner or OSF contributor profile. Do not reproduce the material in a public issue. Confirmed problems will be documented and corrected without silently rewriting version history.
