# Setup and validation

[Project overview](../README.md) · [Deployment](deployment.md)

## Requirements

Use Bun (CI and backend images pin 1.2.20), Python 3.12 and uv. Docker is needed for the supplied Redis Compose service. MongoDB must be supplied separately; the local Compose file starts only Redis. Point development services at a dedicated development database.

At repository root, run `bun install --frozen-lockfile`. In `services/intelligence`, run `uv sync --frozen`.

## Environment

Create local environment files from the tracked examples without overwriting existing configuration:

| File | Configuration |
| --- | --- |
| `apps/api/.env` | Copy [API example](../apps/api/.env.example); configure MongoDB, Redis, Intelligence URL and auth/email settings |
| `apps/worker/.env` | Set the shared connection values listed below; there is no worker example file |
| `services/intelligence/.env` | Copy [Intelligence example](../services/intelligence/.env.example); configure Exa and model credentials |

API and worker run from their respective application directories under Nx. Each needs its own environment; an API `.env` does not configure the worker.

Minimal worker configuration for local services:

```dotenv
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=atlas_dev
REDIS_URL=redis://127.0.0.1:6379
INTELLIGENCE_URL=http://127.0.0.1:8888
```

Use the same database and Redis instance for API and worker. Configure the API's `WEB_APP_URL=http://localhost:3000`. The browser calls `/api`; Rsbuild proxies it to port 3100 and removes that prefix.

For Intelligence, set `EXA_API_KEY` and credentials for `INTELLIGENCE_LLM_PROVIDER`. The example selects `openai` and `gpt-4o-mini`; those are repository defaults. Set `INTELLIGENCE_PORT=8888` as in the example: the settings class alone defaults to 8000. Image interpretation uses a separate vision model and requires OpenAI credentials even with Cerebras text generation.

Email defaults to `EMAIL_PROVIDER=console`, which logs verification messages locally. SMTP requires `SMTP_HOST` and `EMAIL_FROM`; provide `SMTP_USER` and `SMTP_PASS` together when authentication is needed. Keep credentials out of tracked files.

OAuth is enabled per provider when both its client ID and secret are present. Register these local callbacks with the corresponding provider:

- `http://localhost:3000/api/auth/google/callback`
- `http://localhost:3000/api/auth/github/callback`

Use the deployed web origin in place of localhost for production callbacks.

## Run

If services are already running, reuse them. Otherwise, start Redis at repository root:

```bash
bun run redis:up
```

Run each required app in a separate terminal at repository root:

```bash
bun nx run @atlas/intelligence:dev
bun nx run @atlas/api:dev
bun nx run @atlas/web:dev
```

For research execution, start the worker against the intended development database and queue:

```bash
bun nx run @atlas/worker:dev
```

A worker can consume pending jobs immediately and incur provider charges. The root `bun run dev` starts Redis and all development targets, including this worker.

Check `http://localhost:3100/health` and `http://localhost:8888/health`. These checks establish service liveness, not a successful research run. The browser is at `http://localhost:3000`.

## Validation

The JavaScript CI gates, from repository root:

```bash
bun run lint
bun nx run-many -t typecheck --exclude @atlas/intelligence
bun nx run-many -t test --exclude @atlas/intelligence
bun run build
```

The Python gates, from `services/intelligence`:

```bash
uv run ruff check
uv run ruff format --check
uv run mypy
uv run pytest
```

Use Nx test targets instead of root `bun test`, so web tests use their application configuration. Review integration-test connection requirements before running against shared services. Build and unit checks do not establish live OAuth, SMTP, worker or provider behavior; use the acceptance cases in [use cases](use-cases.md).
