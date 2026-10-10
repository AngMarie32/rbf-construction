/**
 * Guards the slice of code the TraderTaxHQ marketing site needs.
 *
 * The public calculators compute with the same engines the internal analysis
 * uses, so a prospect's number and the working papers in the engagement always
 * agree. The plan is for the marketing pages to live in their own deploy, which
 * means those engine files get copied there. Copying only works while the slice
 * stays self-contained: the moment one of them imports the Supabase client, a
 * React hook, or an internal page, the copy stops building and the two sites
 * drift apart in a way nobody notices until a number disagrees.
 *
 * So this script computes the slice from the public pages' own imports, checks
 * that nothing in it reaches outside the allowed set, and records a checksum
 * per file so a second checkout can be compared against this one.
 *
 *   node scripts/check-engine-portability.mjs          # verify
 *   node scripts/check-engine-portability.mjs --write  # record checksums
 *   node scripts/check-engine-portability.mjs --against ../tradertaxhq
 *
 * Exits non-zero on a portability violation or a checksum mismatch.
 */

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(root, 'scripts/engine-manifest.json');

/** The marketing pages. Everything they reach transitively is the slice. */
const ENTRY_POINTS = [
  'src/pages/public/PropFirmTaxesLanding.tsx',
  'src/pages/public/PropTaxCalculator.tsx',
  'src/pages/public/TraderTaxesLanding.tsx',
  'src/pages/public/TraderStatusCheck.tsx',
  'src/pages/public/StateTraderTaxes.tsx',
  'src/pages/tradertax/PublicInquiry.tsx',
];

/**
 * Resolve an import to a repo-relative path.
 *
 * Both forms must be handled: the slice uses `@/` across directories but plain
 * relative imports within `src/utils/traderTax/`, and missing the relative ones
 * would silently leave files like stateConformity.ts out of the manifest.
 */
function resolveImport(spec, fromFile) {
  let base;
  if (spec.startsWith('@/')) {
    base = path.join(root, 'src', spec.slice(2));
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    base = path.resolve(path.dirname(path.join(root, fromFile)), spec);
  } else {
    return null; // a package, not our source
  }
  for (const candidate of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (existsSync(candidate)) return path.relative(root, candidate);
  }
  return null;
}

/** True when a resolved file belongs to the portable area. */
function isPortableFile(relPath) {
  const p = relPath.split(path.sep).join('/');
  return (
    p.startsWith('src/utils/traderTax/') || p.startsWith('src/utils/seo/') || p === 'src/types/tradertax.ts'
  );
}

async function importsOf(relPath) {
  const src = await readFile(path.join(root, relPath), 'utf8');
  // Covers `from '...'`, bare `import '...'`, and dynamic `import('...')`.
  const specs = [
    ...[...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]),
    ...[...src.matchAll(/^\s*import\s+'([^']+)'/gm)].map((m) => m[1]),
    ...[...src.matchAll(/import\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]),
  ];
  return specs;
}

/** Transitive closure over alias imports, restricted to the portable area. */
async function computeSlice() {
  const slice = new Set();
  const queue = [...ENTRY_POINTS];
  const visited = new Set(ENTRY_POINTS);

  while (queue.length) {
    const file = queue.pop();
    for (const spec of await importsOf(file)) {
      const resolved = resolveImport(spec, file);
      if (!resolved) continue;
      if (isPortableFile(resolved)) slice.add(resolved);
      if (!visited.has(resolved)) {
        visited.add(resolved);
        queue.push(resolved);
      }
    }
  }
  return [...slice].sort();
}

async function sha256(absPath) {
  return createHash('sha256').update(await readFile(absPath)).digest('hex');
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const againstIdx = args.indexOf('--against');
  const against = againstIdx >= 0 ? args[againstIdx + 1] : null;

  const slice = await computeSlice();
  const failures = [];

  // 1. Portability: nothing in the slice may reach into the internal app.
  for (const file of slice) {
    for (const spec of await importsOf(file)) {
      const resolved = resolveImport(spec, file);
      // An unresolvable spec is a package import, which is fine — the
      // marketing project installs the same dependencies.
      if (!resolved) continue;
      if (isPortableFile(resolved)) continue;
      const area = path.dirname(resolved.split(path.sep).join('/'));
      failures.push(
        `${file} imports "${spec}" (${resolved}) — outside the portable slice. ` +
          `An engine that needs ${area}/ can no longer be copied to the marketing project.`
      );
    }
  }

  // 2. Checksums, so a second checkout can be diffed against this one.
  const current = {};
  for (const file of slice) current[file] = await sha256(path.join(root, file));

  if (write) {
    await writeFile(MANIFEST, `${JSON.stringify({ files: current }, null, 2)}\n`, 'utf8');
    console.log(`[engine-portability] recorded ${slice.length} files in scripts/engine-manifest.json`);
  } else if (existsSync(MANIFEST)) {
    const recorded = JSON.parse(await readFile(MANIFEST, 'utf8')).files ?? {};
    for (const [file, hash] of Object.entries(current)) {
      if (!recorded[file]) {
        failures.push(`${file} joined the portable slice but is not in the manifest — run --write`);
      } else if (recorded[file] !== hash) {
        failures.push(`${file} changed since the manifest was recorded — copy it to the marketing project, then --write`);
      }
    }
    for (const file of Object.keys(recorded)) {
      if (!current[file]) failures.push(`${file} left the portable slice — run --write`);
    }
  }

  // 3. Optional comparison against the marketing project's own copy.
  if (against) {
    const otherRoot = path.resolve(root, against);
    for (const file of slice) {
      const other = path.join(otherRoot, file);
      if (!existsSync(other)) {
        failures.push(`${file} is missing from ${against}`);
        continue;
      }
      if ((await sha256(other)) !== current[file]) {
        failures.push(`${file} differs from ${against} — the two deploys would compute different numbers`);
      }
    }
  }

  console.log(`[engine-portability] ${slice.length} portable files checked`);
  for (const f of slice) console.log(`  ${f}`);

  if (failures.length) {
    console.error(`\n[engine-portability] ${failures.length} problem(s):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log('[engine-portability] slice is self-contained');
}

main().catch((err) => {
  console.error('[engine-portability]', err);
  process.exit(1);
});
