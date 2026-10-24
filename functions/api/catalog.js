const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60"
    }
  });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 503);
  const { results } = await env.DB.prepare(`
    SELECT p.id, p.name, p.description, p.active, COALESCE(i.quantity, 0) AS quantity
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.active = 1
    ORDER BY p.name
  `).all();
  return json({ ok: true, products: results });
}
