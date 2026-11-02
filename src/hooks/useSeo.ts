import { useEffect } from 'react';
import {
  PageMeta,
  SITE_NAME,
  DEFAULT_SITE_URL,
  OG_IMAGE_PATH,
  absoluteUrl,
  twitterCardType,
} from '@/utils/seo/routeMeta';

/**
 * Keeps the document head correct for the route the user is actually on.
 *
 * The build step (`scripts/prerender-meta.mjs`) bakes these same tags into a
 * static HTML file per route, which is what crawlers and social scrapers read.
 * This hook exists for the other half of the problem: once the SPA takes over,
 * client-side navigation does not reload the document, so without it the head
 * would keep describing whichever page was loaded first.
 *
 * Cleanup restores the document to exactly how it was found. That distinction
 * matters because `index.html` ships its own description and Open Graph tags
 * for the construction portal: a tag this hook *created* is removed on unmount,
 * but a tag that already existed is only reverted to its original content.
 * Deleting those outright would mean a visit to a trader page permanently
 * stripped the portal's own metadata for the rest of the session.
 */

function siteUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined;
  if (configured && configured.trim()) return configured.trim();
  // In the browser, the current origin beats a build-time guess.
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return DEFAULT_SITE_URL;
}

/** Undo steps collected while applying, run in reverse on cleanup. */
type Restore = () => void;

function setMeta(attr: 'name' | 'property', key: string, content: string, undo: Restore[]): void {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (existing) {
    const original = existing.getAttribute('content');
    undo.push(() => {
      if (original === null) existing.removeAttribute('content');
      else existing.setAttribute('content', original);
    });
    existing.setAttribute('content', content);
    return;
  }
  const el = document.createElement('meta');
  el.setAttribute(attr, key);
  el.setAttribute('content', content);
  document.head.appendChild(el);
  undo.push(() => el.remove());
}

function setLink(rel: string, href: string, undo: Restore[]): void {
  const existing = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (existing) {
    const original = existing.getAttribute('href');
    undo.push(() => {
      if (original === null) existing.removeAttribute('href');
      else existing.setAttribute('href', original);
    });
    existing.setAttribute('href', href);
    return;
  }
  const el = document.createElement('link');
  el.setAttribute('rel', rel);
  el.setAttribute('href', href);
  document.head.appendChild(el);
  undo.push(() => el.remove());
}

export function useSeo(meta: PageMeta): void {
  // The jsonLd builder is a fresh closure on every render, so depending on the
  // object identity would re-run this effect forever. Depend on the value.
  const jsonLd = meta.jsonLd ? JSON.stringify(meta.jsonLd(siteUrl())) : '';

  useEffect(() => {
    const base = siteUrl();
    const canonical = absoluteUrl(base, meta.path);
    const undo: Restore[] = [];

    const previousTitle = document.title;
    undo.push(() => {
      document.title = previousTitle;
    });
    document.title = `${meta.title} | ${SITE_NAME}`;

    setMeta('name', 'description', meta.description, undo);
    setMeta('name', 'robots', meta.noindex ? 'noindex, nofollow' : 'index, follow', undo);
    setLink('canonical', canonical, undo);

    setMeta('property', 'og:title', meta.title, undo);
    setMeta('property', 'og:description', meta.description, undo);
    setMeta('property', 'og:type', 'website', undo);
    setMeta('property', 'og:url', canonical, undo);
    setMeta('property', 'og:site_name', SITE_NAME, undo);

    setMeta('name', 'twitter:card', twitterCardType(), undo);
    setMeta('name', 'twitter:title', meta.title, undo);
    setMeta('name', 'twitter:description', meta.description, undo);

    if (OG_IMAGE_PATH) {
      const img = absoluteUrl(base, OG_IMAGE_PATH);
      setMeta('property', 'og:image', img, undo);
      setMeta('name', 'twitter:image', img, undo);
    }

    if (jsonLd) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = jsonLd;
      document.head.appendChild(script);
      undo.push(() => script.remove());
    }

    return () => {
      for (let i = undo.length - 1; i >= 0; i -= 1) undo[i]();
    };
  }, [meta.path, meta.title, meta.description, meta.noindex, jsonLd]);
}
