# Data and seeds

[Architecture](architecture.md) · [Course adaptation](course.md)

Atlas currently uses the native MongoDB driver. TypeScript document types and adapter code define persistence shapes; Mongoose models are not currently part of the application.

## Relationships

```mermaid
erDiagram
    USERS o|--o{ INQUIRY_RUNS : owns
    USERS ||--o{ ATTACHMENT_FILES : owns
    INQUIRY_RUNS o|--o{ ATTACHMENT_FILES : links
    ATTACHMENT_FILES ||--o{ ATTACHMENT_CHUNKS : contains
    USERS ||--o{ PROFILE_FILES : has
    PROFILE_FILES ||--o{ PROFILE_CHUNKS : contains
```

These are logical references, not database-enforced foreign keys. The diagram uses readable aliases for the physical collections below.

| Collection | Data and references |
| --- | --- |
| `users` | String `_id`, email, role, profile, identity records and authentication version |
| `inquiry_runs` | String `_id`; nullable `ownerId` references a user; question, status, progress, costs, embedded places/claims/documents and synthesis |
| `inquiry_attachments.files` | GridFS metadata; `metadata.ownerId` references a user, nullable `metadata.runId` references a run, `metadata.id` is the application attachment ID |
| `inquiry_attachments.chunks` | GridFS bytes linked by `files_id` to a file's GridFS `_id` |
| `profile_images.files` | GridFS images whose `filename` identifies the owning user |
| `profile_images.chunks` | GridFS bytes linked to image files |

Attachment usage counters are stored separately. Redis holds sessions, verification tokens, login state and inquiry queue/notification data. Claims and places are embedded objects, not independent MongoDB collections.

Source: [user adapter](../packages/infrastructure/src/user-store-mongodb/index.ts), [run documents](../packages/infrastructure/src/store-mongodb/collections.ts), [attachment adapter](../packages/infrastructure/src/inquiry-attachment-mongodb/index.ts), [profile images](../packages/infrastructure/src/profile-image-mongodb/index.ts).

## Existing admin seed

`apps/api/scripts/seed-admin.ts` creates a verified super admin or promotes an existing account. It requires `MONGODB_URI`, `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Set `MONGODB_DB_NAME` explicitly to avoid its `atlas` default. After selecting an appropriate database and authorizing that write, run from `apps/api`:

```bash
bun run seed:admin
```

This script changes privileges. It is not a related research dataset importer. Migration scripts are also separate from seeds and may modify or remove existing data.

## Course dataset status

An Excel workbook, matching CSV exports, Mongoose models and a related-data seed have not yet been delivered. The [course proposal](course.md) defines the proposed scope and validation. Existing production research and personal accounts should not be used as demonstration seed material.
