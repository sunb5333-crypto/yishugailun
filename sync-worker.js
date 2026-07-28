const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json; charset=utf-8'
};

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/state\/([A-Za-z0-9_-]{8,64})$/);
    if (!match) return reply({ error: 'not_found' }, 404);
    const key = `state:${match[1]}`;

    if (request.method === 'GET') {
      const value = await env.SYNC_STATE.get(key);
      return value ? new Response(value, { headers }) : reply({ error: 'not_found' }, 404);
    }

    if (request.method === 'PUT') {
      const text = await request.text();
      if (text.length > 500000) return reply({ error: 'payload_too_large' }, 413);
      try { JSON.parse(text); } catch { return reply({ error: 'invalid_json' }, 400); }
      await env.SYNC_STATE.put(key, text);
      return reply({ ok: true, savedAt: new Date().toISOString() });
    }

    return reply({ error: 'method_not_allowed' }, 405);
  }
};
