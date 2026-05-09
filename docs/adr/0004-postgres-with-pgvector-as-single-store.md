# ADR 0004 — Postgres + pgvector as the Single Data Store

**Status:** Accepted  
**Date:** 2026-05-06

## Context

Atlas needs:
1. A relational store for repositories, modules, index runs, tours, questions, answers
2. A vector store for embedding similarity search (Q&A retrieval)

The obvious split is a relational DB (Postgres, SQLite, MySQL) + a dedicated vector DB (Pinecone, Qdrant, Weaviate, Chroma). This introduces two separate data stores with two separate Docker services, two sets of credentials, and two SDKs.

## Decision

Use **a single Postgres instance** with the **pgvector extension** for both relational and vector data.

- Relational tables are managed via Drizzle ORM
- An `embeddings` table uses `vector(1024)` columns for similarity search
- The `VectorStorePort` interface means this choice is fully reversible

## Consequences

**Positive:**
- One Docker service in local dev. One managed instance in production.
- Transactional consistency between relational and vector data (repo delete + embedding delete in one transaction).
- No Pinecone/Qdrant API key needed for MVP — lowers onboarding friction.
- pgvector is production-grade and used by major products (Supabase, Neon, etc.).

**Negative:**
- pgvector's ANN performance at scale is weaker than dedicated vector DBs (Qdrant, Weaviate). At Atlas's expected scale (thousands of repos, not millions), this is not a concern.
- Managing the pgvector Postgres extension in production adds a small ops requirement (enable the extension on the managed DB instance).
- If we need hybrid search (vector + BM25 full-text) later, Postgres full-text search is available but less capable than Elasticsearch.

**Neutral:**
- The `VectorStorePort` interface means swapping to Qdrant requires only a new adapter package, not touching any application or domain code.

## Alternatives considered

- **SQLite + Chroma**: simpler local dev (no Docker), but Chroma is not production-ready for multi-user scenarios, and SQLite has write-concurrency limitations.
- **Postgres + Qdrant**: best-of-breed for each concern. Rejected for MVP because the ops complexity of two services is not justified at current scale.
- **Supabase**: hosted Postgres + pgvector + auth. Compelling for v1. Keeping the door open; the Drizzle adapter would work against Supabase without changes.
