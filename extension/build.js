#!/usr/bin/env node
/**
 * esbuild bundler for the SignedInbox Chrome extension.
 *
 * Environment variables (set in .env or CI):
 *   SUPABASE_URL              — e.g. https://abcdef.supabase.co
 *   SUPABASE_ANON_KEY         — public anon key
 *   TURNSTILE_SITE_KEY        — Cloudflare Turnstile site key
 */

import esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const watch = process.argv.includes('--watch');
const isDev = process.env.NODE_ENV !== 'production';

const define = {
  'YOUR_PROJECT.supabase.co': process.env.SUPABASE_URL || 'http://localhost:54321',
  'YOUR_ANON_KEY': process.env.SUPABASE_ANON_KEY || '',
  'YOUR_TURNSTILE_SITE_KEY': process.env.TURNSTILE_SITE_KEY || '',
};

const sharedOptions = {
  bundle: true,
  sourcemap: isDev,
  minify: !isDev,
  define: Object.fromEntries(
    Object.entries(define).map(([k, v]) => [`'${k}'`, JSON.stringify(v)])
  ),
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
  // Offscreen Turnstile handler — IIFE
  {
    entryPoints: ['offscreen/turnstile.ts'],
    outfile: 'dist/offscreen/turnstile.js',
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

// Static file copies
const staticFiles = [
  ['manifest.json', 'dist/manifest.json'],
  ['popup/popup.html', 'dist/popup/popup.html'],
  ['popup/popup.css', 'dist/popup/popup.css'],
  ['content/gmail-content.css', 'dist/content/gmail-content.css'],
  ['offscreen/turnstile.html', 'dist/offscreen/turnstile.html'],
];

mkdirSync('dist/background', { recursive: true });
mkdirSync('dist/content', { recursive: true });
mkdirSync('dist/offscreen', { recursive: true });
mkdirSync('dist/popup', { recursive: true });
mkdirSync('dist/icons', { recursive: true });

for (const [src, dest] of staticFiles) {
  try { copyFileSync(src, dest); } catch { /* file may not exist yet */ }
}

if (watch) {
  const contexts = await Promise.all(
    entries.map(entry => esbuild.context({ ...sharedOptions, ...entry }))
  );
  await Promise.all(contexts.map(ctx => ctx.watch()));
  console.log('Watching for changes…');
} else {
  await Promise.all(entries.map(entry => esbuild.build({ ...sharedOptions, ...entry })));
  console.log('Build complete → dist/');
}
