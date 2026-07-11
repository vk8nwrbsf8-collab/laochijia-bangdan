/**
 * Cloudflare Pages Function — Firebase 请求透明代理
 * 路径：/api/proxy?url=https://identitytoolkit.googleapis.com/...
 *
 * 国内用户通过 pages.dev 域名访问，Cloudflare 节点代理到 Firebase API
 */

const ALLOWED_HOSTS = [
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firestore.googleapis.com',
  'firebase.googleapis.com',
];

export async function onRequest(context) {
  const { request } = context;

  // CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const reqUrl = new URL(request.url);
  const rawUrl = reqUrl.searchParams.get('url');

  if (!rawUrl) {
    return new Response(JSON.stringify({ error: 'Missing ?url= parameter' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let targetUrl;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid URL' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!ALLOWED_HOSTS.includes(targetUrl.hostname)) {
    return new Response(JSON.stringify({ error: `Host not allowed: ${targetUrl.hostname}` }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 透传请求头，移除 host 等不必要的头
  const forwardHeaders = new Headers();
  const skipHeaders = new Set(['host', 'connection', 'transfer-encoding', 'cf-connecting-ip', 'cf-ray', 'cf-visitor', 'x-forwarded-for', 'x-forwarded-proto']);
  for (const [k, v] of request.headers.entries()) {
    if (!skipHeaders.has(k.toLowerCase())) {
      forwardHeaders.set(k, v);
    }
  }

  try {
    const body = (request.method !== 'GET' && request.method !== 'HEAD')
      ? request.body
      : undefined;

    const upstream = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: forwardHeaders,
      body,
    });

    const responseHeaders = new Headers(corsHeaders);
    const ct = upstream.headers.get('content-type');
    if (ct) responseHeaders.set('Content-Type', ct);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error('[proxy] fetch error:', err);
    return new Response(JSON.stringify({ error: 'Upstream fetch failed', detail: String(err) }), {
      status: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
