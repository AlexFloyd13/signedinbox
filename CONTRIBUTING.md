# Contributing to SignedInbox

## Getting Started

1. Fork the repository and clone your fork
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your values (see README for details)
4. Run the dev server: `npm run dev`

The app will be available at `http://localhost:3000`.

## Making Changes

- Match the existing code style of whatever file you're editing
- TypeScript: prefer explicit types over `any`
- Keep functions small and single-purpose
- Prefer early returns over deeply nested conditionals

## Commit Style

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add sender display name validation
fix: handle expired Turnstile tokens gracefully
chore: update supabase-js to v2.98
```

Valid types: `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`, `perf`

## Pull Requests

- Keep PRs focused — one concern per PR
- Include a clear description of what changed and why
- If your PR changes the database schema, include a migration file

## Security

If you find a security vulnerability, please **do not** open a public issue. Email the maintainer directly instead.
