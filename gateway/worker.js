/**
 * Tameer Gateway Worker — Zero Downtime Intelligent Router
 * Cloudflare Workers | tameer-gateway
 *
 * Architecture:
 *   - Health checks all 4 platforms in parallel
 *   - Caches result in Cloudflare Cache API (30s TTL)
 *   - Scheduled Cron refreshes cache every minute
 *   - Redirects to first healthy platform in priority order
 *   - Emergency fallback to Cloudflare Pages (most reliable)
 */

// ─── Platform Registry ───────────────────────────────────────────────────────
// Edit GITHUB_USERNAME before deploying the worker
const PLATFORMS = [
  {
    name: 'cloudflare-pages',
    label: 'Cloudflare Pages',
    url: 'https://tameer-job-application.pages.dev',
    priority: 1,
    timeout: 4000,
  },
  {
    name: 'vercel',
    label: 'Vercel',
    url: 'https://tameer-job-application.vercel.app',
    priority: 2,
    timeout: 5000,
  },
  {
    name: 'firebase-hosting',
    label: 'Firebase Hosting',
    url: 'https://job-application-7f8d4.web.app',
    priority: 3,
    timeout: 5000,
  },
  {
    name: 'github-pages',
    label: 'GitHub Pages',
    url: 'https://GITHUB_USERNAME.github.io/tameer-job-application', // ← replace with your GitHub username
    priority: 4,
    timeout: 6000,
  },
];

const CACHE_KEY   = 'https://tameer-gateway-internal/health-v1';
const CACHE_TTL   = 30; // seconds between live re-checks for user requests
const PRIMARY     = PLATFORMS[0];

// ─── Health Check ─────────────────────────────────────────────────────────────
async function checkPlatform(platform) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), platform.timeout);
  try {
    const res = await fetch(platform.url, {
      method: 'HEAD',
      signal: ctrl.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    const ok = res.status >= 200 && res.status < 500;
    return { ...platform, healthy: ok, code: res.status };
  } catch (err) {
    clearTimeout(timer);
    return { ...platform, healthy: false, code: 0, error: String(err.message) };
  }
}

async function runHealthChecks() {
  const results = await Promise.allSettled(PLATFORMS.map(checkPlatform));
  return results.map(r =>
    r.status === 'fulfilled' ? r.value : { ...PRIMARY, healthy: false }
  );
}

// ─── Cache Helpers ────────────────────────────────────────────────────────────
async function getCachedPlatform(cache) {
  try {
    const res = await cache.match(CACHE_KEY);
    if (!res) return null;
    const data = await res.json();
    const age = Date.now() - (data.ts || 0);
    if (age < CACHE_TTL * 1000) return data;
  } catch (_) { /* ignore */ }
  return null;
}

async function setCachedPlatform(cache, data) {
  try {
    await cache.put(
      CACHE_KEY,
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch (_) { /* ignore */ }
}

// ─── Routing Logic ────────────────────────────────────────────────────────────
async function resolvePlatform(cache) {
  // 1. Try cache
  const cached = await getCachedPlatform(cache);
  if (cached && cached.chosen) return cached.chosen;

  // 2. Run fresh checks
  const results = await runHealthChecks();
  const healthy = results
    .filter(r => r.healthy)
    .sort((a, b) => a.priority - b.priority);
  const chosen = healthy.length > 0 ? healthy[0] : PRIMARY;

  await setCachedPlatform(cache, { chosen, results, ts: Date.now() });
  return chosen;
}

// ─── Status Dashboard HTML ────────────────────────────────────────────────────
function buildStatusHtml(results) {
  const rows = results.map(p => `
    <div class="card ${p.healthy ? 'up' : 'down'}">
      <div class="info">
        <strong>${p.label}</strong>
        <a href="${p.url}" target="_blank">${p.url}</a>
        ${p.error ? `<span class="err">${p.error}</span>` : ''}
      </div>
      <span class="badge">${p.healthy ? '✅ يعمل' : '❌ متوقف'} ${p.code ? `(${p.code})` : ''}</span>
    </div>`).join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>لوحة مراقبة منصات التعمير</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Tahoma,Arial,sans-serif;background:#f1f5f9;color:#1e293b;padding:24px}
    h1{color:#1d4ed8;margin-bottom:4px}
    .ts{color:#64748b;font-size:13px;margin-bottom:20px}
    .card{background:#fff;border-radius:12px;padding:16px 20px;margin:10px 0;border-right:6px solid;display:flex;justify-content:space-between;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
    .card.up{border-color:#22c55e}
    .card.down{border-color:#ef4444}
    .info{display:flex;flex-direction:column;gap:4px}
    .info a{color:#3b82f6;font-size:13px;word-break:break-all}
    .err{color:#ef4444;font-size:12px}
    .badge{white-space:nowrap;font-weight:700;font-size:14px}
    .summary{background:#1e3a8a;color:white;border-radius:12px;padding:14px 20px;margin-bottom:16px;font-size:15px}
  </style>
</head>
<body>
  <h1>🔭 بوابة التعمير — مراقبة المنصات</h1>
  <p class="ts">آخر فحص: ${new Date().toUTCString()}</p>
  <div class="summary">
    منصات تعمل: <strong>${results.filter(r => r.healthy).length}</strong> من <strong>${results.length}</strong>
    &nbsp;|&nbsp; المنصة النشطة: <strong>${results.filter(r => r.healthy).sort((a,b)=>a.priority-b.priority)[0]?.label ?? 'لا يوجد'}</strong>
  </div>
  ${rows}
  <p style="margin-top:16px;color:#94a3b8;font-size:12px">يتم التحديث تلقائياً كل 30 ثانية</p>
  <script>setTimeout(()=>location.reload(),30000)</script>
</body>
</html>`;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
export default {
  async fetch(request, env, ctx) {
    const url      = new URL(request.url);
    const cache    = caches.default;
    const pathname = url.pathname;

    // ── /__health  JSON health check ─────────────────────────────────────────
    if (pathname === '/__health') {
      const results = await runHealthChecks();
      return new Response(
        JSON.stringify({ gateway: 'ok', ts: new Date().toISOString(), platforms: results }, null, 2),
        { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // ── /__status  HTML dashboard ─────────────────────────────────────────────
    if (pathname === '/__status') {
      const results = await runHealthChecks();
      // Refresh cache after dashboard view
      const healthy = results.filter(r => r.healthy).sort((a, b) => a.priority - b.priority);
      ctx.waitUntil(setCachedPlatform(cache, { chosen: healthy[0] ?? PRIMARY, results, ts: Date.now() }));
      return new Response(buildStatusHtml(results), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8', 'Cache-Control': 'no-store' },
      });
    }

    // ── Main routing ──────────────────────────────────────────────────────────
    try {
      const platform = await resolvePlatform(cache);
      const dest     = platform.url + pathname + url.search + url.hash;
      return Response.redirect(dest, 302);
    } catch (_) {
      return Response.redirect(PRIMARY.url + pathname + url.search, 302);
    }
  },

  // ── Cron: refresh health cache every minute ─────────────────────────────────
  async scheduled(_event, _env, ctx) {
    const cache   = caches.default;
    const results = await runHealthChecks();
    const healthy = results.filter(r => r.healthy).sort((a, b) => a.priority - b.priority);
    const chosen  = healthy.length > 0 ? healthy[0] : PRIMARY;
    ctx.waitUntil(setCachedPlatform(cache, { chosen, results, ts: Date.now() }));
    console.log(`[Gateway Cron] Active: ${chosen.name} | Healthy: ${healthy.length}/${PLATFORMS.length}`);
  },
};
