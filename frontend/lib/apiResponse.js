// Helpers for the public API: JSON responses with permissive CORS so anyone
// can call the read-only endpoints from a browser or server.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=10',
};

export function apiJson(data, status = 200) {
  return Response.json(data, { status, headers: CORS_HEADERS });
}

export function apiOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
