/**
 * Bakes per-route metadata into static HTML after `vite build`.
 *
 * Why this exists: the app is a client-rendered SPA with a single index.html.
 * `useSeo()` fixes the head once React is running, which is enough for Google,
 * but social scrapers (Twitter, Facebook, LinkedIn, Slack) do not execute
 * JavaScript at all — they read the raw HTML and leave. Without this step every
 * shared trader-tax link would preview as the construction portal.
 *
 * So for each public route we copy dist/index.html to dist/<route>/index.html
 * with that route's title, description, canonical, Open Graph tags and JSON-LD
 * already in the markup. A host that serves <route>/index.html for <route>
 * then hands crawlers real metadata, while browsers still boot the same SPA
 * bundle and render the same page. Hosts that fall back to index.html for
 * unknown paths are unaffected — they just keep the client-side behaviour.
 *
 * Also emits sitemap.xml and the sitemap reference in robots.txt.
 */

import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const SITE_URL = (process.env.VITE_PUBLIC_SITE_URL || '').trim();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * routeMeta.ts is TypeScript using the `@` alias, so it cannot be imported
 * directly by Node. Bundle it to a temp ESM file and import that, which keeps
 * the route list defined in exactly one place.
 */
async function loadRouteMeta() {
  const outfile = path.join(dist, '.routeMeta.mjs');
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
  await rm(outfile, { force: true });
  return mod;
}

function renderHead(meta, baseUrl, absoluteUrl, siteName, ogImagePath, twitterCard) {
  const canonical = absoluteUrl(baseUrl, meta.path);
  const tags = [
    `<title>${escapeHtml(`${meta.title} | ${siteName}`)}</title>`,
    `<meta name="description" content="${escapeHtml(meta.description)}" />`,
    `<meta name="robots" content="${meta.noindex ? 'noindex, nofollow' : 'index, follow'}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(meta.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(meta.description)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(siteName)}" />`,
    `<meta name="twitter:card" content="${twitterCard}" />`,
    `<meta name="twitter:title" content="${escapeHtml(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(meta.description)}" />`,
  ];
  if (ogImagePath) {
    const img = absoluteUrl(baseUrl, ogImagePath);
    tags.push(`<meta property="og:image" content="${escapeHtml(img)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(img)}" />`);
  }
  if (meta.jsonLd) {
    // `</script>` inside JSON would close the tag early.
    const json = JSON.stringify(meta.jsonLd(baseUrl)).replace(/<\//g, '<\\/');
    tags.push(`<script type="application/ld+json">${json}</script>`);
  }
  return tags.map((t) => `    ${t}`).join('\n');
}

/**
 * Replace the shell's own title/description rather than appending to them, so a
 * crawler never sees two titles and pick the construction portal's.
 */
function applyHead(shell, headHtml) {
  let html = shell
    .replace(/\n?\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\n?\s*<meta\s+name="description"[^>]*>/gi, '')
    .replace(/\n?\s*<meta\s+property="og:(?:title|description|type|image|url|site_name)"[^>]*>/gi, '')
    .replace(/\n?\s*<meta\s+name="twitter:(?:card|site|title|description|image)"[^>]*>/gi, '')
    // The shell credits the construction portal. Wrong author on a tax page.
    .replace(/\n?\s*<meta\s+name="author"[^>]*>/gi, '');

  if (!/<\/head>/i.test(html)) throw new Error('dist/index.html has no </head> to inject into');
  html = html.replace(/<\/head>/i, `${headHtml}\n  </head>`);
  return html;
}

function sitemapXml(pages, baseUrl, absoluteUrl) {
  const today = new Date().toISOString().slice(0, 10);
  const urls = pages
    .map(
      (p) =>
        `  <url>\n    <loc>${escapeHtml(absoluteUrl(baseUrl, p.path))}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

async function main() {
  if (!existsSync(dist)) {
    console.error('[prerender-meta] no dist/ — run `vite build` first');
    process.exit(1);
  }

  const { allPublicPages, indexablePages, absoluteUrl, SITE_NAME, DEFAULT_SITE_URL, OG_IMAGE_PATH, twitterCardType } =
    await loadRouteMeta();
  const twitterCard = twitterCardType();

  // Without a configured site URL, canonical and og:url would point at a
  // placeholder domain, which is worse than omitting the step entirely.
  if (!SITE_URL) {
    console.warn(
      '[prerender-meta] VITE_PUBLIC_SITE_URL is not set — using ' +
        `${DEFAULT_SITE_URL} for canonical and sitemap URLs. Set it in the deploy ` +
        'environment so these point at the real host.'
    );
  }
  const baseUrl = SITE_URL || DEFAULT_SITE_URL;

  const shell = await readFile(path.join(dist, 'index.html'), 'utf8');
  const pages = allPublicPages();

  // Dynamic segments cannot be baked — a concrete page exists per state, and
  // those come back from allPublicPages() already expanded.
  const bakeable = pages.filter((p) => !p.path.includes(':'));
  const skipped = pages.length - bakeable.length;

  for (const meta of bakeable) {
    const head = renderHead(meta, baseUrl, absoluteUrl, SITE_NAME, OG_IMAGE_PATH, twitterCard);
    const outDir = path.join(dist, meta.path.replace(/^\//, ''));
    await mkdir(outDir, { recursive: true });
    await writeFile(path.join(outDir, 'index.html'), applyHead(shell, head), 'utf8');
  }

  const indexable = indexablePages().filter((p) => !p.path.includes(':'));
  await writeFile(path.join(dist, 'sitemap.xml'), sitemapXml(indexable, baseUrl, absoluteUrl), 'utf8');

  const robotsPath = path.join(dist, 'robots.txt');
  const robots = existsSync(robotsPath) ? await readFile(robotsPath, 'utf8') : 'User-agent: *\nAllow: /\n';
  const sitemapLine = `Sitemap: ${absoluteUrl(baseUrl, '/sitemap.xml')}`;
  if (!robots.includes(sitemapLine)) {
    await writeFile(robotsPath, `${robots.trimEnd()}\n\n${sitemapLine}\n`, 'utf8');
  }

  console.log(
    `[prerender-meta] baked ${bakeable.length} routes, ` +
      `${indexable.length} in sitemap${skipped ? `, skipped ${skipped} dynamic` : ''}`
  );
}

main().catch((err) => {
  console.error('[prerender-meta]', err);
  process.exit(1);
});
