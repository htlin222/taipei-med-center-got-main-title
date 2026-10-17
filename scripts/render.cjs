// Render a range of frames of the title sequence and pipe them into ffmpeg.
// usage: node scripts/render.cjs --from 0 --to 300 --out seg.mp4 [--fps 30] [--w 1920] [--h 1080] [--port 8765]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const FPS = +arg('fps', 30), W = +arg('w', 1920), H = +arg('h', 1080);
const FROM = +arg('from', 0), TO = +arg('to', 60), OUT = arg('out', 'seg.mp4'), PORT = arg('port', 8765);
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(0);
  page.on('pageerror', e => console.error('PAGEERR', e.message));
  // every shard must build the identical scene: seed Math.random before any page script runs
  await page.addInitScript(() => { let s = 20261017 >>> 0; Math.random = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; });
  await page.goto(`http://localhost:${PORT}/index.html?capture&t=0`);
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 0 });
  await page.evaluate(() => document.fonts.ready);
  // warm-up: compile every shader and finish texture uploads before the first kept frame
  for (const t of [FROM / FPS, FROM / FPS]) await page.evaluate(t => window.__render(t), t);
  await page.waitForTimeout(1500);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  const el = page.locator('#frame'); const t0 = Date.now();
  for (let f = FROM; f < TO; f++) {
    await page.evaluate(t => window.__render(t), f / FPS);
    const buf = await el.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - FROM) % 10 === 0) console.log(`frame ${f} / [${FROM},${TO})  ${((Date.now() - t0) / 1000 / (f - FROM + 1)).toFixed(1)} s/frame`);
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r));
  await browser.close(); console.log('done', OUT, ((Date.now() - t0) / 1000).toFixed(0), 's');
})().catch(e => { console.error(e); process.exit(1); });
