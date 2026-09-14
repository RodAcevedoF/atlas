# Course requirements and proposed adaptation

[Project overview](../README.md) · [Data model](data.md)

This is an implementation proposal, not a claim that the remaining course requirements are complete.

## Current evidence

| Requirement | Evidence or gap |
| --- | --- |
| Real problem | Geographic context and source inspection for research questions |
| React frontend | Implemented in `apps/web` |
| Node.js backend | Not established: API and worker currently run on Bun |
| Backend users collection | Implemented by `MongoUserStore` |
| Authentication and authorization | Password/email verification, OAuth, sessions and role gates are implemented; live acceptance is separate |
| Related collections | Users, inquiry runs and GridFS attachments have logical references |
| Excel with at least 100 records and CSV export | Dataset artifacts remain to be created |
| Node.js filesystem read/write | Course import/export workflow remains to be implemented |
| Mongoose models before seeds | Mongoose is not declared; models remain to be implemented |
| Seeds insert related data | Existing admin seed does not satisfy this dataset requirement |
| Optional uploads | CSV/XLSX and image inquiry attachments plus profile images are implemented |

## Smallest proposed change

Keep the current domain, use cases, MongoDB collections and Python service. Add a Node.js execution path for the actual API and worker, with compatible TypeScript loading. Replace the `Bun.password` adapter with a Node-compatible password adapter, verifying existing stored hashes before migration. Bun can remain the workspace installer and test runner. The backend image and launch targets must then actually use Node; a Node-only seed does not establish a Node backend.

Add a focused course seed tool with Mongoose models for existing `users` and `inquiry_runs` document shapes. Using two related collections would avoid manufacturing a third domain entity or manually seeding GridFS internals; confirm this meets the course's “2–3 collections” wording before implementation. Keep application persistence on its existing adapters. Mongoose would be a new dependency scoped to the tool; ExcelJS is already available in infrastructure. The password implementation and TypeScript launch mechanism need a compatibility probe before choosing additional packages.

## Proposed dataset and artifacts

Use a deterministic synthetic demonstration dataset: 10 fictional users and 100 completed inquiry runs distributed among them. Mark every question and synthesis as demo content, use reserved `example.com` email/source domains, and label fabricated claims explicitly. These records demonstrate Atlas behavior; they are not retrieved evidence. Keep all runs terminal so seeds cannot schedule research jobs.

Create a workbook with `users` and `inquiry_runs` sheets, and one UTF-8 CSV per sheet. Include an explicit record count of 110 data rows, excluding headers. Map each run's `ownerId` to a workbook user ID. A data dictionary should define columns, dates, nullable fields and any JSON-encoded nested run artifacts. The importer should derive persistence defaults explicitly rather than hiding them in spreadsheet cells. Password hashes must be generated at import time from an explicitly supplied demo credential, never published in the workbook.

Use Node `fs` APIs to read CSV inputs and write the export manifest and validation report. Define Mongoose models before inserting records. Select a dedicated local `atlas_course_demo` database and require an explicit target; do not inherit a production API environment. Use deterministic IDs and repeatable upserts without dropping collections.

## Completion evidence

Validate workbook and CSV parity, row counts, duplicate IDs, status values and all owner references before connecting to MongoDB. After an authorized import, read back counts and references and prove a second import adds no records. Confirm that the real API can read the resulting runs and render their mapped artifacts. Validate password signup/login and legacy hash compatibility under Node, plus worker execution against isolated services before changing deployment.

Approval is needed before adding production dependencies or writing the dataset to a database. Runtime adaptation should be agreed before implementation; deployment remains a separate action.
