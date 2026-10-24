const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" }
});

function authorized(request, env) {
  const token = env.ADMIN_API_TOKEN;
  return Boolean(token && request.headers.get("authorization") === `Bearer ${token}`);
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  if (!env.DB) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 503);
  const [totals, statuses, stock] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS orders, COALESCE(SUM(CASE WHEN status != 'Annulée' THEN total ELSE 0 END), 0) AS revenue, COALESCE(AVG(total), 0) AS average_order FROM orders").first(),
    env.DB.prepare("SELECT status, COUNT(*) AS count FROM orders GROUP BY status ORDER BY count DESC").all(),
    env.DB.prepare("SELECT COALESCE(SUM(quantity), 0) AS units, COUNT(*) AS products FROM inventory WHERE quantity > 0").first()
  ]);
  return json({ ok: true, totals, statuses: statuses.results, stock });
}
