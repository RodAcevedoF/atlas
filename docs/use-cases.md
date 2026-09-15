# Use cases and access

[Project overview](../README.md) · [AI flow](ai.md)

## Research a question

A signed-in reader submits a question and research window. The API creates an inquiry run and publishes a job. With a worker running, retrieval and location normalisation produce a map; synthesis adds the Intelligence summary and supported place-level reads. The reader can select a place, inspect its claims and follow the original source links.

Run history and detail routes support returning to research. Updates arrive over SSE. A queued run needs a worker to advance; lack of coverage and execution failure are separate outcomes.

CSV and XLSX uploads can provide table context. JPEG, PNG and WebP uploads can provide image context. Attachment interpretation proposes a question before inquiry execution. Profile images are a separate upload flow. Saved-dataset UI and flow acceptance was reported by the owner on 2026-09-15; deployment verification remains separate.

## Save and reuse a dataset

Open **Saved datasets** in the research question box. Choose **Save a dataset** to upload CSV or Excel. Workbooks with multiple sheets offer a choice of one sheet or all; confirm with **Import worksheets** to save each selected sheet as a separate dataset.

Saved rows show the file name, row count and column count, with actions to **Use**, download CSV or delete. **Use** attaches one saved table for interpretation; saving or downloading does not trigger AI. Research interpretation previews the first 20 rows while all imported rows remain stored. The [dataset guide](../data/course/README.md#use-in-atlas) covers the complete flow and limits.

## Authentication and roles

Password signup includes email verification. Google and GitHub OAuth are available when configured. Sessions use the `atlas_session` cookie with Redis-backed session storage. The API implements rate limits, failed-password-login controls and request-origin protection; UI navigation is not the authorization boundary.

| Actor | Access |
| --- | --- |
| Visitor | Public landing and authentication flows |
| Authenticated user | Research, run access subject to use-case rules, own profile and uploads |
| Admin | Admin analytics and user directory |
| Super admin | Admin access plus user creation, role/email/password changes and deletion |

Source: [auth gate](../apps/api/src/core/auth-hook.ts), [admin routes](../apps/api/src/routes/admin.ts), [user management](../apps/api/src/routes/users.ts). Inquiry use cases enforce run access and ownership rules beyond the authentication gate.

## Live acceptance

Use a dedicated test account to verify signup, verification, login, logout and protected routes. Confirm Google/GitHub callbacks on the deployed origin. Exercise admin visibility and rejection of privileged API actions for ordinary users.

Check the map at multiple zoom levels, place selection, linked claims, run history and Intelligence content. Confirm profile/avatar placement on wide and narrow layouts, the browser title `Atlas | Mapped research`, and formatted retrieval spend in admin analytics.

Research acceptance needs an explicitly selected question, a bounded number of runs and a coordinated worker. Observe queue consumption, progressive results, terminal status and source links. Email and paid-provider tests require their own configured services; deployment success alone does not establish these behaviors.
