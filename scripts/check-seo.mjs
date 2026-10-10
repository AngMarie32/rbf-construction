/**
 * Verifies the public-page SEO invariants. No test runner, no new dependencies:
 * `node scripts/check-seo.mjs`, non-zero exit on failure.
 *
 * The invariant that actually earns this script: a public route added to the
 * router without metadata would silently ship with the construction portal's
 * title. That is invisible in review and expensive in search, so it fails here.
 */

import { build } from 'esbuild';
import { readFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const failures = [];
const checks = [];
function check(name, ok, detail = '') {
  checks.push(name);
  if (!ok) failures.push(detail ? `${name}: ${detail}` : name);
}

async function loadRouteMeta() {
  const tmp = path.join(os.tmpdir(), `seo-check-${process.pid}`);
  await mkdir(tmp, { recursive: true });
  const outfile = path.join(tmp, 'routeMeta.mjs');
  await build({
    entryPoints: [path.join(root, 'src/utils/seo/routeMeta.ts')],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    alias: { '@': path.join(root, 'src') },
  });
  const mod = await import(pathToFileURL(outfile).href);
  await rm(tmp, { recursive: true, force: true });
  return mod;
}

/**
 * The router is the source of truth for which routes exist. Parse the public
 * ones out of it so this check cannot drift from reality.
 */
async function publicRoutesFromRouter() {
  const src = await readFile(path.join(root, 'src/App.tsx'), 'utf8');
  const routes = [...src.matchAll(/<Route\s+path="([^"]+)"\s+element=\{([^}]*)/g)].map((m) => ({
    path: m[1],
    element: m[2],
  }));
  // A route wrapped in ProtectedRoute is behind login and needs no metadata.
  return routes
    .filter((r) => !r.element.includes('ProtectedRoute'))
    .map((r) => r.path)
    .filter((p) => p.startsWith('/prop-firm-taxes') || p.startsWith('/trader-taxes') || p === '/inquiry');
}

async function main() {
  const { allPublicPages, indexablePages, STATIC_PUBLIC_PAGES, OG_IMAGE_PATH, twitterCardType } =
    await loadRouteMeta();
  const pages = allPublicPages();

  // 1. Every unprotected marketing route in the router has metadata.
  const routerPaths = await publicRoutesFromRouter();
  const registered = new Set(STATIC_PUBLIC_PAGES.map((p) => p.path));
  for (const rp of routerPaths) {
    // Dynamic routes are covered by their expanded concrete pages instead.
    if (rp.includes(':')) {
      const prefix = rp.slice(0, rp.indexOf(':'));
      check(
        `dynamic route ${rp} has expanded pages`,
        pages.some((p) => p.path.startsWith(prefix) && !p.path.includes(':')),
        'no concrete pages generated for this prefix'
      );
      continue;
    }
    check(`router route ${rp} has metadata`, registered.has(rp), 'not in STATIC_PUBLIC_PAGES');
  }

  // 2. No duplicate paths, which would make the baked files fight each other.
  const seen = new Map();
  for (const p of pages) seen.set(p.path, (seen.get(p.path) ?? 0) + 1);
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([p]) => p);
  check('no duplicate page paths', dupes.length === 0, dupes.join(', '));

  // 3. Titles and descriptions in a range search engines will actually render.
  for (const p of pages) {
    check(`${p.path} title non-empty`, p.title.trim().length > 0);
    check(`${p.path} title <= 70 chars`, p.title.length <= 70, `${p.title.length} chars: "${p.title}"`);
    check(
      `${p.path} description 50-320 chars`,
      p.description.length >= 50 && p.description.length <= 320,
      `${p.description.length} chars`
    );
    check(`${p.path} path has no trailing slash`, p.path === '/' || !p.path.endsWith('/'));
  }

  // 4. Thin conversion pages stay out of the index.
  const indexablePaths = new Set(indexablePages().map((p) => p.path));
  check('/inquiry is noindex', !indexablePaths.has('/inquiry'), 'a bare lead form should not be indexed');

  // 5. Claiming a large social card without an image yields a blank preview.
  check(
    'twitter card type matches image availability',
    OG_IMAGE_PATH ? twitterCardType() === 'summary_large_image' : twitterCardType() === 'summary'
  );

  // 6. The publishing-safety rule: state page metadata is built from published
  //    copy, so a rate or dollar figure leaking into it would leak to search
  //    results too. Structural facts only.
  const money = /\$\s?\d|\d\s?%|\d+\.\d+\s?percent/i;
  for (const p of pages.filter((p) => /^\/trader-taxes\/[a-z]{2}$/.test(p.path))) {
    check(`${p.path} description quotes no figures`, !money.test(p.description), p.description.slice(0, 120));
    check(`${p.path} title quotes no figures`, !money.test(p.title), p.title);
  }

  console.log(`[check-seo] ${checks.length} assertions over ${pages.length} pages`);
  if (failures.length) {
    console.error(`\n[check-seo] ${failures.length} FAILED:`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('[check-seo] all passed');
}

main().catch((err) => {
  console.error('[check-seo]', err);
  process.exit(1);
});
