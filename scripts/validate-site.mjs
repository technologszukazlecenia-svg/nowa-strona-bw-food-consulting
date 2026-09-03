import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distDir = path.join(root, 'dist');
const dataPath = path.join(root, 'data', 'cities.json');
const EXPECTED_CITY_COUNT = Number(process.env.EXPECTED_CITY_COUNT || 1026);
const BASE_URL = String(process.env.SITE_URL || 'https://lp.technologzywnosci.pl').replace(/\/$/, '');
const PUBLISH_MODE = process.env.PUBLISH_MODE === 'production' ? 'production' : 'preview';
const expectedRobots = PUBLISH_MODE === 'production' ? 'index,follow,max-image-preview:large' : 'noindex,follow';

const errors = [];
const warnings = [];
const metrics = {
  cityCount: 0,
  cityFiles: 0,
  sitemapUrls: 0,
  internalCityLinks: 0,
  minPageBytes: Number.POSITIVE_INFINITY,
  maxPageBytes: 0,
  minWords: Number.POSITIVE_INFINITY,
  maxWords: 0,
  titles: 0,
  descriptions: 0,
  canonicals: 0,
};

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function countMatches(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function extract(text, pattern) {
  return text.match(pattern)?.[1] || '';
}

function decodeEntities(value) {
  return String(value)
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#039;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function visibleWords(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.split(' ').length : 0;
}

async function validateCityPage(city, expectedPaths, titles, descriptions, canonicals) {
  const filename = `technolog-zywnosci-${city.slug}.html`;
  const filepath = path.join(distDir, filename);
  let html;
  try {
    html = await readFile(filepath, 'utf8');
  } catch {
    fail(`Missing city page: ${filename}`);
    return;
  }

  const fileStat = await stat(filepath);
  metrics.minPageBytes = Math.min(metrics.minPageBytes, fileStat.size);
  metrics.maxPageBytes = Math.max(metrics.maxPageBytes, fileStat.size);
  if (fileStat.size < 18_000) fail(`${filename}: page is unexpectedly small (${fileStat.size} bytes)`);

  const words = visibleWords(html);
  metrics.minWords = Math.min(metrics.minWords, words);
  metrics.maxWords = Math.max(metrics.maxWords, words);
  if (words < 850) fail(`${filename}: too little visible content (${words} words)`);

  if (!/^<!doctype html>/i.test(html)) fail(`${filename}: missing HTML doctype`);
  if (!/<html\s+lang="pl">/i.test(html)) fail(`${filename}: missing lang="pl"`);
  if (countMatches(html, /<h1\b/gi) !== 1) fail(`${filename}: expected exactly one H1`);
  if (!html.includes(`data-teryt="${city.teryt}"`)) fail(`${filename}: missing TERYT marker ${city.teryt}`);
  if (!html.includes(`data-city="${city.name.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`)) fail(`${filename}: missing body city context`);
  if (!html.includes(city.name.replaceAll('&', '&amp;'))) fail(`${filename}: city name is absent`);
  if (!html.includes(`Województwo ${city.voivodeship}`) && !html.includes(`województwo ${city.voivodeship}`)) fail(`${filename}: voivodeship context is absent`);

  const title = decodeEntities(extract(html, /<title>([\s\S]*?)<\/title>/i)).trim();
  const description = decodeEntities(extract(html, /<meta\s+name="description"\s+content="([^"]*)"/i)).trim();
  const robots = decodeEntities(extract(html, /<meta\s+name="robots"\s+content="([^"]*)"/i)).trim();
  const canonical = decodeEntities(extract(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i)).trim();
  const expectedCanonical = `${BASE_URL}/technolog-zywnosci-${city.slug}`;

  if (!title) fail(`${filename}: missing title`);
  if (!description) fail(`${filename}: missing meta description`);
  if (robots !== expectedRobots) fail(`${filename}: robots is ${JSON.stringify(robots)}, expected ${JSON.stringify(expectedRobots)}`);
  if (canonical !== expectedCanonical) fail(`${filename}: canonical mismatch: ${canonical}`);
  if (!title.includes(city.name)) fail(`${filename}: title does not contain city name`);
  if (!description.includes(city.name)) fail(`${filename}: description does not contain city name`);
  if (title.length > 75) warn(`${filename}: long title (${title.length} chars)`);
  if (description.length < 120 || description.length > 180) warn(`${filename}: meta description length is ${description.length}`);

  if (titles.has(title)) fail(`${filename}: duplicate title with ${titles.get(title)}`);
  else titles.set(title, filename);
  if (descriptions.has(description)) fail(`${filename}: duplicate description with ${descriptions.get(description)}`);
  else descriptions.set(description, filename);
  if (canonicals.has(canonical)) fail(`${filename}: duplicate canonical with ${canonicals.get(canonical)}`);
  else canonicals.set(canonical, filename);

  metrics.titles += Boolean(title);
  metrics.descriptions += Boolean(description);
  metrics.canonicals += Boolean(canonical);

  const forbidden = [
    ['Landingi dependency', /landingi\.(?:com|pl)|landingiapp|landing_page_id/i],
    ['template placeholder', /\{\{\s*[A-Z_][^}]*\}\}|\[MIASTO\]|>\s*PLACEHOLDER\s*</i],
    ['test domain', /example\.(?:com|org|net)/i],
    ['technical GUS suffix', /\((?:1|4)\)(?:\s|<)|\s-\smiasto\s*</i],
  ];
  for (const [label, pattern] of forbidden) if (pattern.test(html)) fail(`${filename}: found ${label}`);

  for (const required of ['id="zakres"', 'id="proces"', 'id="doswiadczenie"', 'id="faq"', 'id="kontakt"', 'data-contact-form']) {
    if (!html.includes(required)) fail(`${filename}: missing required element ${required}`);
  }
  for (const field of ['name="name"', 'name="email"', 'name="phone"', 'name="company"', 'name="category"', 'name="stage"', 'name="message"', 'name="consent"']) {
    if (!html.includes(field)) fail(`${filename}: missing form field ${field}`);
  }

  const schemaBlocks = [...html.matchAll(/<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  if (schemaBlocks.length !== 1) {
    fail(`${filename}: expected one JSON-LD block, got ${schemaBlocks.length}`);
  } else {
    try {
      const schema = JSON.parse(schemaBlocks[0][1]);
      const graphTypes = new Set((schema['@graph'] || []).map((item) => item['@type']));
      for (const type of ['Organization', 'Service', 'WebPage', 'WebSite', 'BreadcrumbList', 'FAQPage']) {
        if (!graphTypes.has(type)) fail(`${filename}: JSON-LD is missing ${type}`);
      }
    } catch (error) {
      fail(`${filename}: invalid JSON-LD (${error.message})`);
    }
  }

  const cityLinks = [...html.matchAll(/href="(\/technolog-zywnosci-[a-z0-9-]+)"/g)].map((match) => match[1]);
  metrics.internalCityLinks += cityLinks.length;
  if (cityLinks.length < 6) warn(`${filename}: only ${cityLinks.length} related city links`);
  for (const href of cityLinks) if (!expectedPaths.has(href)) fail(`${filename}: broken internal city link ${href}`);
}

async function main() {
  const cities = JSON.parse(await readFile(dataPath, 'utf8'));
  metrics.cityCount = cities.length;
  if (cities.length !== EXPECTED_CITY_COUNT) fail(`Expected ${EXPECTED_CITY_COUNT} city records, got ${cities.length}`);

  const slugs = new Set();
  const teryt = new Set();
  const expectedPaths = new Set();
  for (const city of cities) {
    if (slugs.has(city.slug)) fail(`Duplicate slug in data: ${city.slug}`);
    slugs.add(city.slug);
    if (teryt.has(city.teryt)) fail(`Duplicate TERYT in data: ${city.teryt}`);
    teryt.add(city.teryt);
    expectedPaths.add(`/technolog-zywnosci-${city.slug}`);
  }

  const files = await readdir(distDir);
  const cityFiles = files.filter((name) => /^technolog-zywnosci-[a-z0-9-]+\.html$/.test(name));
  metrics.cityFiles = cityFiles.length;
  if (cityFiles.length !== EXPECTED_CITY_COUNT) fail(`Expected ${EXPECTED_CITY_COUNT} generated city files, got ${cityFiles.length}`);

  const unexpectedFiles = cityFiles.filter((filename) => !slugs.has(filename.replace(/^technolog-zywnosci-/, '').replace(/\.html$/, '')));
  for (const filename of unexpectedFiles) fail(`Unexpected generated city file: ${filename}`);

  const titles = new Map();
  const descriptions = new Map();
  const canonicals = new Map();
  for (const city of cities) await validateCityPage(city, expectedPaths, titles, descriptions, canonicals);

  const indexHtml = await readFile(path.join(distDir, 'index.html'), 'utf8');
  const cityCardCount = countMatches(indexHtml, /\bdata-city-card\b/g);
  if (cityCardCount !== EXPECTED_CITY_COUNT) fail(`Index contains ${cityCardCount} city cards; expected ${EXPECTED_CITY_COUNT}`);
  const regionCount = countMatches(indexHtml, /\bdata-region-section\b/g);
  if (regionCount !== 16) fail(`Index contains ${regionCount} region sections; expected 16`);
  if (!indexHtml.includes(`data-search-count>${EXPECTED_CITY_COUNT}<`)) fail('Index search counter has an incorrect initial value');
  if (!indexHtml.includes(`>${EXPECTED_CITY_COUNT}</strong>`)) fail('Index does not display the official city count');

  const sitemap = await readFile(path.join(distDir, 'sitemap.xml'), 'utf8');
  const sitemapUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeEntities(match[1]));
  metrics.sitemapUrls = sitemapUrls.length;
  if (sitemapUrls.length !== EXPECTED_CITY_COUNT + 1) fail(`Sitemap contains ${sitemapUrls.length} URLs; expected ${EXPECTED_CITY_COUNT + 1}`);
  if (new Set(sitemapUrls).size !== sitemapUrls.length) fail('Sitemap contains duplicate URLs');
  if (!sitemapUrls.includes(`${BASE_URL}/`)) fail('Sitemap is missing the city hub URL');
  for (const city of cities) {
    const url = `${BASE_URL}/technolog-zywnosci-${city.slug}`;
    if (!sitemapUrls.includes(url)) fail(`Sitemap is missing ${url}`);
  }

  const robots = await readFile(path.join(distDir, 'robots.txt'), 'utf8');
  if (PUBLISH_MODE === 'preview') {
    if (!/Disallow:\s*\//i.test(robots)) fail('Preview robots.txt does not block crawling');
    if (/Sitemap:/i.test(robots)) warn('Preview robots.txt exposes a sitemap directive');
  } else {
    if (!/Allow:\s*\//i.test(robots)) fail('Production robots.txt does not allow crawling');
    if (!robots.includes(`${BASE_URL}/sitemap.xml`)) fail('Production robots.txt is missing the sitemap URL');
  }

  const siteManifest = JSON.parse(await readFile(path.join(distDir, 'site-manifest.json'), 'utf8'));
  if (siteManifest.cityCount !== EXPECTED_CITY_COUNT) fail('site-manifest cityCount mismatch');
  if (siteManifest.sitemapUrlCount !== EXPECTED_CITY_COUNT + 1) fail('site-manifest sitemapUrlCount mismatch');
  if (siteManifest.buildMode !== PUBLISH_MODE) fail(`site-manifest mode is ${siteManifest.buildMode}, expected ${PUBLISH_MODE}`);
  for (const asset of Object.values(siteManifest.assets || {})) {
    try { await stat(path.join(distDir, 'assets', asset)); }
    catch { fail(`Missing fingerprinted asset: ${asset}`); }
  }

  const urlManifest = JSON.parse(await readFile(path.join(distDir, 'url-manifest.json'), 'utf8'));
  if (urlManifest.length !== EXPECTED_CITY_COUNT) fail(`URL manifest contains ${urlManifest.length} rows; expected ${EXPECTED_CITY_COUNT}`);

  const report = {
    status: errors.length ? 'FAIL' : 'PASS',
    buildMode: PUBLISH_MODE,
    checkedAt: new Date().toISOString(),
    metrics: {
      ...metrics,
      minPageBytes: Number.isFinite(metrics.minPageBytes) ? metrics.minPageBytes : 0,
      minWords: Number.isFinite(metrics.minWords) ? metrics.minWords : 0,
      uniqueTitles: titles.size,
      uniqueDescriptions: descriptions.size,
      uniqueCanonicals: canonicals.size,
    },
    errors,
    warnings: warnings.slice(0, 200),
    warningCount: warnings.length,
  };
  await writeFile(path.join(distDir, 'qa-report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  console.log(`QA ${report.status}: ${metrics.cityFiles} city pages, ${metrics.sitemapUrls} sitemap URLs.`);
  console.log(`Content range: ${report.metrics.minWords}-${report.metrics.maxWords} words; file range: ${report.metrics.minPageBytes}-${report.metrics.maxPageBytes} bytes.`);
  console.log(`Unique titles/descriptions/canonicals: ${titles.size}/${descriptions.size}/${canonicals.size}.`);
  if (warnings.length) console.log(`Warnings: ${warnings.length} (first ${Math.min(warnings.length, 12)} shown below)`);
  for (const warning of warnings.slice(0, 12)) console.log(`WARN: ${warning}`);
  if (errors.length) {
    for (const error of errors.slice(0, 80)) console.error(`ERROR: ${error}`);
    if (errors.length > 80) console.error(`...and ${errors.length - 80} more errors`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
