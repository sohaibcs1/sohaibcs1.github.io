const ALLOWED_ORIGINS = new Set([
  'https://sohaibcs1.github.io',
  'http://localhost:4200'
]);

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);
    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers});

    try {
      const url = new URL(request.url);
      if (request.method === 'POST' && url.pathname === '/visit') {
        const stats = await recordVisit(request, env);
        return json(stats, headers);
      }
      if (request.method === 'GET' && url.pathname === '/visitors') {
        return json(await publicStats(env), headers);
      }
      if (request.method === 'GET' && url.pathname === '/visitor-map') {
        return json(await visitorMap(env, url), headers);
      }
      if (url.pathname === '/health') return json({ok: true}, headers);
      return json({error: 'Not found'}, headers, 404);
    } catch (error) {
      return json({error: 'Visitor service unavailable'}, headers, 500);
    }
  }
};

async function recordVisit(request, env) {
  const now = new Date().toISOString();
  const dayKey = now.slice(0, 10);
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const visitorHash = await sha256(`${env.HASH_SALT || 'local-development'}:${dayKey}:${ip}`);
  const cf = request.cf || {};
  const body = await request.json().catch(() => ({}));
  const code = cf.country || 'XX';
  const country = countryName(code);

  await env.DB.prepare(`
    INSERT INTO visits (visitor_hash, day_key, country_code, country, region, city, latitude, longitude, pageviews, first_seen, last_seen, path)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
    ON CONFLICT(visitor_hash, day_key) DO UPDATE SET
      pageviews = pageviews + 1,
      last_seen = excluded.last_seen,
      path = excluded.path
  `).bind(visitorHash, dayKey, code, country, cf.region || '', cf.city || 'Unknown', numberOrNull(cf.latitude),
    numberOrNull(cf.longitude), now, now, String(body.path || '/').slice(0, 200)).run();

  return publicStats(env);
}

async function publicStats(env) {
  const today = new Date().toISOString().slice(0, 10);
  const totals = await env.DB.prepare(`
    SELECT COALESCE(SUM(pageviews), 0) totalVisits,
           COUNT(DISTINCT CASE WHEN country_code != 'XX' THEN country_code END) countries,
           COALESCE(SUM(CASE WHEN day_key = ? THEN pageviews ELSE 0 END), 0) visitsToday
    FROM visits
  `).bind(today).first();
  const locations = await locationSummary(env, 30);
  return {...totals, locations};
}

async function visitorMap(env, url) {
  const days = clamp(url.searchParams.get('days'), 1, 3650, 30);
  const page = clamp(url.searchParams.get('page'), 1, 100000, 1);
  const limit = clamp(url.searchParams.get('limit'), 1, 50, 10);
  const country = url.searchParams.get('country') || '';
  const city = url.searchParams.get('city') || '';
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const where = `last_seen >= ? AND (? = '' OR country_code = ?) AND (? = '' OR city = ?)`;
  const bindings = [cutoff, country, country, city, city];

  const count = await env.DB.prepare(`SELECT COUNT(*) total FROM visits WHERE ${where}`).bind(...bindings).first();
  const result = await env.DB.prepare(`
    SELECT country_code countryCode, country, region, city, pageviews, last_seen visitedAt
    FROM visits WHERE ${where} ORDER BY last_seen DESC LIMIT ? OFFSET ?
  `).bind(...bindings, limit, (page - 1) * limit).all();
  const summary = await env.DB.prepare(`
    SELECT COALESCE(SUM(pageviews), 0) totalVisits,
           COUNT(DISTINCT CASE WHEN country_code != 'XX' THEN country_code END) countries,
           COALESCE(SUM(CASE WHEN day_key = ? THEN pageviews ELSE 0 END), 0) visitsToday
    FROM visits WHERE last_seen >= ?
  `).bind(new Date().toISOString().slice(0, 10), cutoff).first();

  return {summary, locations: await locationSummary(env, days), total: count.total || 0, visits: result.results || []};
}

async function locationSummary(env, days) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const result = await env.DB.prepare(`
    SELECT country_code countryCode, country, region, city,
           AVG(latitude) latitude, AVG(longitude) longitude, SUM(pageviews) visits
    FROM visits
    WHERE last_seen >= ? AND latitude IS NOT NULL AND longitude IS NOT NULL
    GROUP BY country_code, country, region, city ORDER BY visits DESC LIMIT 200
  `).bind(cutoff).all();
  return result.results || [];
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.has(origin) ? origin : 'https://sohaibcs1.github.io';
  return {'Access-Control-Allow-Origin': allowed, 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type', 'Content-Type': 'application/json', 'Vary': 'Origin'};
}

function json(value, headers, status = 200) {
  return new Response(JSON.stringify(value), {status, headers});
}

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, Math.floor(number))) : fallback;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function countryName(code) {
  if (!code || code === 'XX') return 'Unknown';
  try { return new Intl.DisplayNames(['en'], {type: 'region'}).of(code) || code; } catch (_) { return code; }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

