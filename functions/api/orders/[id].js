const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
});

export async function onRequestGet({ request, env, params }) {
  if (!env.DB) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 503);
  const phone = new URL(request.url).searchParams.get("phone")?.trim();
  const id = params.id;
  if (!phone || !/^AG-[A-Z0-9]+$/.test(id)) return json({ ok: false, error: "INVALID_LOOKUP" }, 400);
  const order = await env.DB.prepare(
    "SELECT id, status, total, created_at, updated_at FROM orders WHERE id = ? AND phone = ?"
  ).bind(id, phone).first();
  if (!order) return json({ ok: false, error: "ORDER_NOT_FOUND" }, 404);
  return json({ ok: true, order });
}
