#!/usr/bin/env node
/**
 * esbuild bundler for the signedinbox Chrome extension.
 *
 * Environment variables (set in .env or CI):
 *   SUPABASE_URL              — e.g. https://abcdef.supabase.co
 *   SUPABASE_ANON_KEY         — public anon key
 *   TURNSTILE_SITE_KEY        — Cloudflare Turnstile site key
 */

import esbuild from 'esbuild';
import sharp from 'sharp';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const watch = process.argv.includes('--watch');
const isDev = process.env.NODE_ENV !== 'production';

// Load env vars from .env files (simple parser, no dotenv dependency).
// Checks local .env first, then parent directory .env.local.
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    // Strip surrounding quotes and trailing \n artifacts from Vercel CLI
    val = val.replace(/^["']|["']$/g, '').replace(/\\n$/, '').trim();
    if (!(key in process.env)) process.env[key] = val;
  }
}

// Load order: local .env → parent .env.local (lower priority loses)
loadEnvFile(join(__dirname, '.env'));
loadEnvFile(resolve(__dirname, '../.env.local'));

// Normalize NEXT_PUBLIC_* variants to the names build.js expects
if (!process.env.SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}
if (!process.env.TURNSTILE_SITE_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
  process.env.TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
}
if (!process.env.GOOGLE_CLIENT_ID && process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
  process.env.GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

// esbuild replaces these global identifiers at bundle time.
// Corresponding `declare const` statements in each TS file satisfy the compiler.
const define = {
  __SUPABASE_URL__: JSON.stringify(process.env.SUPABASE_URL || 'http://localhost:54321'),
  __SUPABASE_ANON_KEY__: JSON.stringify(process.env.SUPABASE_ANON_KEY || ''),
  __TURNSTILE_SITE_KEY__: JSON.stringify(process.env.TURNSTILE_SITE_KEY || ''),
  __GOOGLE_CLIENT_ID__: JSON.stringify(process.env.GOOGLE_CLIENT_ID || ''),
};

const sharedOptions = {
  bundle: true,
  sourcemap: isDev,
  minify: !isDev,
  define,
};

const entries = [
  // Background service worker — ESM
  {
    entryPoints: ['background/background.ts'],
    outfile: 'dist/background/background.js',
    format: 'esm',
    platform: 'browser',
  },
  // Content script — IIFE (required by Chrome)
  {
    entryPoints: ['content/gmail-content.ts'],
    outfile: 'dist/content/gmail-content.js',
    format: 'iife',
    platform: 'browser',
  },
  // Offscreen silent Turnstile handler — IIFE
  {
    entryPoints: ['offscreen/turnstile.ts'],
    outfile: 'dist/offscreen/turnstile.js',
    format: 'iife',
    platform: 'browser',
  },
  // Challenge popup fallback — IIFE
  {
    entryPoints: ['challenge/challenge.ts'],
    outfile: 'dist/challenge/challenge.js',
    format: 'iife',
    platform: 'browser',
  },
  // Popup — IIFE
  {
    entryPoints: ['popup/popup.ts'],
    outfile: 'dist/popup/popup.js',
    format: 'iife',
    platform: 'browser',
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────

async function generateIcons() {
  const svgPath = join(__dirname, 'icons/icon.svg');
  const svg = readFileSync(svgPath);
  await Promise.all(
    [16, 48, 128].map(size =>
      sharp(svg)
        .resize(size, size)
        .png()
        .toFile(join(__dirname, `icons/icon${size}.png`))
    )
  );
}

// Regenerate icons if any are missing
const iconsMissing = [16, 48, 128].some(
  s => !existsSync(join(__dirname, `icons/icon${s}.png`))
);
if (iconsMissing) await generateIcons();

// ─── Directories + static copies ──────────────────────────────────────────────

mkdirSync('dist/background', { recursive: true });
mkdirSync('dist/content', { recursive: true });
mkdirSync('dist/offscreen', { recursive: true });
mkdirSync('dist/challenge', { recursive: true });
mkdirSync('dist/popup', { recursive: true });
mkdirSync('dist/icons', { recursive: true });

// Template manifest.json — replace __SUPABASE_ORIGIN__ with the actual Supabase host
const supabaseOrigin = new URL(process.env.SUPABASE_URL || 'http://localhost:54321').origin;
const manifest = readFileSync('manifest.json', 'utf8').replace('__SUPABASE_ORIGIN__', supabaseOrigin);
writeFileSync('dist/manifest.json', manifest);

const staticFiles = [
  ['popup/popup.html', 'dist/popup/popup.html'],
  ['popup/popup.css', 'dist/popup/popup.css'],
  ['content/gmail-content.css', 'dist/content/gmail-content.css'],
  ['offscreen/turnstile.html', 'dist/offscreen/turnstile.html'],
  ['challenge/challenge.html', 'dist/challenge/challenge.html'],
  ['icons/icon16.png', 'dist/icons/icon16.png'],
  ['icons/icon48.png', 'dist/icons/icon48.png'],
  ['icons/icon128.png', 'dist/icons/icon128.png'],
];

for (const [src, dest] of staticFiles) {
  copyFileSync(src, dest);
}

// ─── TypeScript bundle ────────────────────────────────────────────────────────

if (watch) {
  const contexts = await Promise.all(
    entries.map(entry => esbuild.context({ ...sharedOptions, ...entry }))
  );
  await Promise.all(contexts.map(ctx => ctx.watch()));
  console.log('Watching for changes…');
} else {
  await Promise.all(entries.map(entry => esbuild.build({ ...sharedOptions, ...entry })));
  // Remove source maps from production builds
  if (!isDev) {
    const { globSync } = await import('glob');
    for (const f of globSync('dist/**/*.map', { cwd: __dirname })) {
      rmSync(join(__dirname, f));
    }
  }
  console.log('Build complete → dist/');
}
