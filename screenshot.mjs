/**
 * screenshot.mjs
 * Usage: node screenshot.mjs <url> [label] [scrollY]
 *   url    — page to capture (page must accept ?preview=1&scroll=N)
 *   label  — optional filename suffix
 *   scrollY — optional scroll position in px (passed to page via ?scroll=N)
 */
import { execFile }     from 'child_process';
import { promisify }    from 'util';
import { rename, mkdir, readdir, rm } from 'fs/promises';
import { existsSync }   from 'fs';
import { join }         from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const CHROME    = 'C:/Users/TYA/AppData/Local/Google/Chrome/Application/chrome.exe';
const OUT_DIR   = join(__dirname, 'temporary screenshots');

async function getNextIndex() {
  if (!existsSync(OUT_DIR)) return 1;
  const files = await readdir(OUT_DIR);
  const nums  = files.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] ?? '0')).filter(n => n > 0);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

const url     = process.argv[2] || 'http://localhost:3000';
const label   = process.argv[3] ? `-${process.argv[3]}` : '';
const section = process.argv[4] || ''; // optional section id to isolate

await mkdir(OUT_DIR, { recursive: true });
const idx     = await getNextIndex();
const outFile = join(OUT_DIR, `screenshot-${idx}${label}.png`);

// unique tmp paths per run to avoid cross-run conflicts
const runId  = Date.now();
const TMP_SS = join(__dirname, `ss_tmp_${runId}.png`);
const tmpDir = join(__dirname, `.chrome_${runId}`);

const qs      = `?preview=1${section ? `&section=${section}` : ''}`;
const target  = url.split('?')[0] + qs;

console.log(`→ ${target}`);
console.log(`  Saving to: screenshot-${idx}${label}.png`);

try {
    await execFileAsync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    `--screenshot=${TMP_SS}`,
    '--window-size=1440,900',
    '--hide-scrollbars',
    `--user-data-dir=${tmpDir}`,
    target,
  ], { timeout: 30000 });
} catch {
  /* Chrome exits non-zero even on success */
}

if (existsSync(TMP_SS)) {
  await rename(TMP_SS, outFile);
  console.log(`  ✓ Saved: ${outFile}`);
} else {
  console.error('  ✗ Chrome did not produce a screenshot.');
  process.exit(1);
}

rm(tmpDir, { recursive: true, force: true }).catch(() => {});
