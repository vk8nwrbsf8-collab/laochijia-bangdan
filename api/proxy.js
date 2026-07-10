/**
 * Vercel Serverless Function — Firebase 请求透明代理
 * 用途：国内用户通过 vercel.app 域名访问，代理请求到 Firebase API
 *
 * 路由：
 *   /api/proxy?url=https://identitytoolkit.googleapis.com/...
 *   /api/proxy?url=https://securetoken.googleapis.com/...
 *   /api/proxy?url=https://firestore.googleapis.com/...
 */

const ALLOWED_HOSTS = [
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
  'firebase.googleapis.com',
];

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const rawUrl = req.query?.url;
  if (!rawUrl) {
    return res.status(400).json({ error: 'Missing ?url= parameter' });
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
    return res.status(403).json({ error: `Host not allowed: ${targetUrl.hostname}` });
  }

  // 透传 query string（如 key= 等）
  const forwardHeaders = {};
  const skipHeaders = new Set(['host', 'connection', 'transfer-encoding']);
  for (const [k, v] of Object.entries(req.headers)) {
    if (!skipHeaders.has(k.toLowerCase())) {
      forwardHeaders[k] = v;
    }
  }

  try {
    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    }

    const upstream = await fetch(targetUrl.toString(), {
      method: req.method,
      headers: forwardHeaders,
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('Content-Type', ct);
    return res.send(text);
  } catch (err) {
    console.error('[proxy] fetch error:', err);
    return res.status(502).json({ error: 'Upstream fetch failed', detail: String(err) });
  }
}
