const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

function validOrder(input) {
  return input && typeof input.name === "string" && input.name.trim().length >= 2 &&
    input.name.trim().length <= 120 &&
    typeof input.phone === "string" && input.phone.trim().length >= 6 &&
    input.phone.trim().length <= 40 &&
    (!input.email || (typeof input.email === "string" && input.email.length <= 160)) &&
    (!input.note || (typeof input.note === "string" && input.note.length <= 1000)) &&
    Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 50 &&
    (!input.id || (typeof input.id === "string" && /^AG-[A-Z0-9]+$/.test(input.id))) &&
    input.items.every(item => item && typeof item.productId === "string" && item.productId.length <= 80 &&
      typeof item.region === "string" && item.region.length <= 10 && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0 && Number(item.quantity) <= 100 &&
      Number.isFinite(Number(item.faceValue)) && Number(item.faceValue) >= 0 &&
      Number.isFinite(Number(item.unitPrice)) && Number(item.unitPrice) >= 0);
}

export async function onRequestGet({ env }) {
  return json({ ok: false, error: "ADMIN_AUTH_REQUIRED" }, 401);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 503);
  let input;
  try { input = await request.json(); } catch { return json({ ok: false, error: "INVALID_JSON" }, 400); }
  if (!validOrder(input)) return json({ ok: false, error: "INVALID_ORDER" }, 400);

  const id = input.id || `AG-${Date.now().toString(36).toUpperCase()}`;
  const duplicate = await env.DB.prepare("SELECT id FROM orders WHERE id = ?").bind(id).first();
  if (duplicate) return json({ ok: false, error: "ORDER_ALREADY_EXISTS", id }, 409);
  const total = Number(input.total);
  if (!Number.isFinite(total) || total < 0 || total > 1000000) return json({ ok: false, error: "INVALID_TOTAL" }, 400);

  const existingCustomer = await env.DB.prepare("SELECT id FROM customers WHERE phone = ?").bind(input.phone.trim()).first();
  const customerId = existingCustomer?.id || `CUS-${crypto.randomUUID()}`;
  const customerStatement = existingCustomer
    ? env.DB.prepare("UPDATE customers SET name = ?, email = ? WHERE id = ?").bind(input.name.trim(), input.email || null, customerId)
    : env.DB.prepare("INSERT INTO customers (id, name, phone, email) VALUES (?, ?, ?, ?)").bind(customerId, input.name.trim(), input.phone.trim(), input.email || null);
  const orderStatement = env.DB.prepare(
    "INSERT INTO orders (id, customer_id, status, customer_name, phone, email, note, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(id, customerId, "En attente de confirmation", input.name.trim(), input.phone.trim(), input.email || null, input.note || null, total);
  const itemStatements = input.items.map(item => env.DB.prepare(
    "INSERT INTO order_items (order_id, product_id, region, face_value, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)"
  ).bind(id, item.productId, item.region, Number(item.faceValue), Math.floor(Number(item.quantity)), Number(item.unitPrice)));
  await env.DB.batch([customerStatement, orderStatement, ...itemStatements]);

  return json({ ok: true, id, status: "En attente de confirmation" }, 201);
}
