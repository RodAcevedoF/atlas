# Atlas — mapped research

Atlas turns a research question into a map of sourced claims. It helps readers see where events are happening, inspect evidence for each place, and read an accompanying Intelligence summary without assembling that geographic context from separate search results.

Research starts with Exa retrieval. The Python Intelligence service normalises claim locations and synthesises results; the browser progressively displays the map and analysis. Locations describe the claims themselves, rather than the publisher's headquarters.

## Features

- Interactive MapLibre map with place selection and linked source claims.
- Research questions, run history, progress over server-sent events, and Intelligence summaries.
- Saved CSV/Excel datasets with worksheet selection, CSV downloads and reuse in research.
- CSV, Excel and image attachments that can help formulate a research question.
- Password signup and email verification, Google/GitHub login, profiles and avatars.
- Role-based administration for user management and research analytics.

External research requires configured providers and a running worker. The standard VPS deployment leaves the worker inactive; see [deployment](docs/deployment.md).

## Saved datasets

Open **Saved datasets** in the research question box and choose **Save a dataset**. For workbooks with multiple worksheets, choose one or all; each imported sheet becomes a separate dataset. Choose **Use** to attach a saved table, interpret its context and review the proposed research question.

Imports support up to 10 worksheets, 1,000 total data rows, 50 columns per sheet and 5 MB. All imported rows are saved; research interpretation previews the first 20 rows of the selected dataset. See the [dataset guide](data/course/README.md) for the full flow, limits and sample workbook.

## Planned improvements

- **Polymarket retrieval:** use prediction-market information as additional research context.
- **X.com retrieval:** use relevant posts and discussions as additional research context.

These integrations are planned. Exa is the current research retrieval source.

## Stack

| Area | Implementation |
| --- | --- |
| Web | React 19, TypeScript, Rsbuild, Tailwind, MapLibre |
| API / worker | Bun, Fastify, application use cases and infrastructure adapters |
| Intelligence | Python 3.12+, FastAPI, LangGraph, LangChain |
| Retrieval / models | Exa; configurable OpenAI or Cerebras text models |
| Persistence | MongoDB native driver, Mongoose dataset storage, GridFS uploads |
| Queue / sessions | Redis |
| Tooling | Bun workspaces, Nx, Biome, uv, Ruff, mypy, pytest |

## Local development

Install Bun (CI uses 1.2.20), Python 3.12 and uv. Provide MongoDB and Redis, then follow the [setup guide](docs/setup.md) to configure each application's environment before starting services.

```bash
bun install --frozen-lockfile
```

From `services/intelligence`:

```bash
uv sync --frozen
```

Web uses `http://localhost:3000`, API `http://localhost:3100`, and the supplied Intelligence environment example selects `http://localhost:8888`.

## Guides

- [Architecture and package boundaries](docs/architecture.md)
- [Setup, environment and validation](docs/setup.md)
- [Use cases, authentication and roles](docs/use-cases.md)
- [AI execution, streaming and costs](docs/ai.md)
- [CI and VPS deployment](docs/deployment.md)
- [Data relationships and seeds](docs/data.md)
- [Saved datasets, sample workbook and import workflow](data/course/README.md)
- [Course requirements and remaining runtime work](docs/course.md)
