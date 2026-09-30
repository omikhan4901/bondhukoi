#!/usr/bin/env node
/**
 * Exports every <section data-name> in graphics.html to <name>.png.
 *   node export.mjs            (needs playwright or playwright-core; set CHROMIUM_PATH if needed)
 * Re-run after changing the text, or after re-taking the app screens in shots/.
 */
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(process.env.PLAYWRIGHT_FROM || import.meta.url);
const { chromium } = require('playwright-core');
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, 'graphics.html')).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const sections = await page.$$('section[data-name]');
for (const s of sections) {
  const name = await s.getAttribute('data-name');
  await s.screenshot({ path: path.join(here, `${name}.png`), omitBackground: name === 'play-icon' });
  console.log(name);
}
await browser.close();
