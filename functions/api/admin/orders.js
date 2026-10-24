const STATUSES = new Set([
  "En attente de confirmation",
  "Paiement confirmé",
  "En préparation",
  "Livrée",
  "Annulée"
]);

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8" }
});

function authorized(request, env) {
  const expected = env.ADMIN_API_TOKEN;
  const received = request.headers.get("authorization") || "";
  return Boolean(expected && received === `Bearer ${expected}`);
}

export async function onRequestGet({ request, env }) {
  if (!authorized(request, env)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  if (!env.DB) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 503);
  const { results } = await env.DB.prepare(
    "SELECT id, status, customer_name, phone, email, note, total, created_at, updated_at FROM orders ORDER BY created_at DESC LIMIT 200"
  ).all();
  return json({ ok: true, orders: results });
}

export async function onRequestPatch({ request, env }) {
  if (!authorized(request, env)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  if (!env.DB) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  if (typeof input?.id !== "string" || !STATUSES.has(input.status)) {
    return json({ ok: false, error: "INVALID_STATUS" }, 400);
  }
  const result = await env.DB.prepare(
    "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(input.status, input.id).run();
  if (!result.meta.changes) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404);
  return json({ ok: true, id: input.id, status: input.status });
}
