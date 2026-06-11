# OpenUI Chat

OpenUI Chat is a [Next.js](https://nextjs.org) App Router project organized
around explicit presentation, application, and infrastructure layers.

## Getting Started

Install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Project Structure

```text
public/
  assets/          # Static product assets
src/
  app/              # Next.js routes and framework composition
  types/            # Ambient declarations and module augmentation
  presentation/     # UI components, layouts, providers, and feature screens
  application/      # User flows, hooks, state, and application services
  infrastructure/   # APIs, network clients, SDKs, and technical integrations
  shared/           # Stable cross-layer types, constants, schemas, and utilities
```

The dependency direction is:

```text
presentation -> application -> infrastructure
```

`src/app` should remain a thin framework boundary. Cross-layer imports use
explicit aliases:

```text
@application/*    -> src/application/*
@infrastructure/* -> src/infrastructure/*
@presentation/*   -> src/presentation/*
@shared/*         -> src/shared/*
```

The `@/*` alias remains available for framework-level imports from `src/*`.

## Validation

```bash
pnpm lint
pnpm format
pnpm check
pnpm run ci
pnpm typecheck
pnpm build
```
