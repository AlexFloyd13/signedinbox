# Security Policy

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email **security@signedinbox.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact

You'll receive a response within 48 hours. Please allow reasonable time to investigate and patch before any public disclosure.

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ |

## Scope

In scope:
- Authentication and session handling
- Ed25519 signing and key management
- API endpoints (`/api/v1/`)
- Supabase RLS policy bypasses
- Chrome extension security issues

Out of scope:
- Issues in third-party dependencies (report upstream)
- Self-hosted deployments with misconfigured secrets
- Social engineering

## Cryptographic Design

- Stamps are signed with **Ed25519** keypairs
- Private keys are encrypted at rest with **AES-256-GCM**
- Recipient emails are **SHA-256 hashed** and never stored in plaintext
- API keys are stored as **HMAC-SHA-256** hashes
- Cloudflare Turnstile tokens are **single-use** — replays are rejected server-side
