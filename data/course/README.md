# Infrastructure research dataset

This is **synthetic teaching data**, not evidence of real infrastructure projects. It contains 120 fictional projects across 20 real cities, with six categories per city. No personal information or external research calls were used to generate it.

- [Excel workbook](infrastructure-projects.xlsx): one `projects` sheet with 120 data rows plus a header.
- [UTF-8 CSV](infrastructure-projects.csv): the same columns and rows, with quoted fields and CRLF line endings.
- [Manifest and column dictionary](manifest.json): record count, provenance and field meanings.

Open the workbook in Excel or LibreOffice and export the `projects` sheet as **CSV UTF-8, comma-delimited**. Do not choose a locale-dependent semicolon delimiter. The supplied generator exports both formats and verifies every value matches.

## Generate and verify

From repository root, with dependencies installed and Node 22.18+:

```bash
npm run dataset:generate
```

The script runs under Node and uses `node:fs/promises` to read input files and write the workbook, CSV and manifest. It validates full table contents; the existing attachment profile is a separate, sampled representation used for research.

## Seed the isolated demo database

Configure `MONGODB_URI` in the local `apps/api/.env`. The seed explicitly targets **atlas_course_demo**, regardless of `MONGODB_DB_NAME`. MongoDB must support transactions (Atlas or a replica set).

```bash
npm run dataset:seed -- data/course/infrastructure-projects.csv /tmp/atlas-course-seed.json --apply
```

The `.xlsx` file is accepted in place of the CSV. The seed validates that its input matches the generated synthetic dataset before connecting. It creates one synthetic owner in `users`, one entry in `datasets`, and 120 entries in `dataset_records`. Mongoose models are defined before the dataset insertion. The owner has no login identity or password and cannot log in.

Each record has a `datasetId`, `ownerId`, zero-based `position`, and ordered string `values`. Dataset metadata holds its columns, name, owner, record count and creation time. String values preserve identifiers, Unicode and leading zeros consistently across Excel and CSV. `investment_eur` contains whole euros encoded as text; consumers can convert that column explicitly for calculations.

The seed repeats the same transactional write and reads it back to verify counts, references and repeatability. It writes a JSON verification report to the path supplied. It does not enqueue research or create completed research runs.

```mermaid
erDiagram
    USERS ||--o{ DATASETS : owns
    DATASETS ||--o{ DATASET_RECORDS : contains
    USERS ||--o{ DATASET_RECORDS : owns
```

## Use in Atlas

1. In the research question box, open **Saved datasets**, choose **Save a dataset**, and select a CSV or XLSX file. Atlas validates and saves all rows under your signed-in account. The synthetic seed owner is separate.
2. Choose **Use** to export the saved table as CSV and upload it as a research attachment. This prepares a table profile; it does not start an AI call. The **CSV** link downloads the saved table, and **Delete** removes it from saved datasets.
3. Add any instructions and submit to interpret the attachment. AI receives the table profile, including a preview of the first 20 rows, and your instructions. It returns a summary and proposed research question, or asks for clarification.
4. Review and edit the question, or request refinement. Submit the accepted question to start the existing research flow. Research execution needs an active worker and configured providers.

```mermaid
flowchart LR
    Save[Save all rows] --> Use[Use as CSV attachment]
    Use --> Profile[Profile with first 20 rows]
    Profile --> Interpret[User submits for AI interpretation]
    Interpret --> Review[Review proposed question]
    Review --> Research[Submit research question]
```

Saving, downloading and attaching do not invoke an AI provider. Interpretation and research are separate user-triggered steps. Uploaded rows are not automatically mapped, and Atlas does not run research for each row. Map points come from the resulting research claims. All 120 course records are stored, but the preview does not establish exhaustive analysis of every project. End-to-end browser and dataset-triggered research acceptance remain pending.

Saved datasets accept one sheet, 1–1000 data rows, 1–50 uniquely named columns, and files up to 5 MB. Their serialized UTF-8 CSV must also fit within 5 MB so it can be reused as an attachment. Formulas and formula-like values are rejected; use plain cell values. Each row must match the header width. Downloads pending when the dataset component unmounts, including on account change, cannot subsequently attach that file.

## Verification commands

```bash
node --experimental-transform-types apps/api/scripts/datasets/verify-http.ts
node --env-file=apps/api/.env --experimental-transform-types apps/api/scripts/datasets/verify-persistence.ts
```

The persistence check writes only to `atlas_course_demo` and removes the temporary dataset it creates. It checks owner isolation, transactional rollback and deletion of associated rows. The HTTP check uses an in-memory app with no database writes. It runs under Node because Bun 1.2.20's Fastify injection path can execute a handler after an early authentication reply; that issue reproduces independently of dataset routes.

These tools establish a Node filesystem workflow and Mongoose-backed dataset storage. The application's API and worker still launch with Bun; meeting a separate Node backend runtime requirement remains additional work.
