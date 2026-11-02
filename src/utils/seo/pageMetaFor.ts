import { PageMeta, STATIC_PUBLIC_PAGES } from './routeMeta';

/**
 * Look up a fixed public route's metadata by its path.
 *
 * Throws on an unknown path rather than quietly serving a blank head: a route
 * added without metadata is a bug worth failing loudly in development, and
 * every caller here passes a literal that the test suite checks.
 */
export function pageMetaFor(path: string): PageMeta {
  const found = STATIC_PUBLIC_PAGES.find((p) => p.path === path);
  if (!found) {
    throw new Error(
      `No SEO metadata registered for "${path}". Add it to STATIC_PUBLIC_PAGES in src/utils/seo/routeMeta.ts.`
    );
  }
  return found;
}
