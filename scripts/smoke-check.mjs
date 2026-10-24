import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const required = [
  "index.html", "style.css", "app.js", "data.js", "manifest.webmanifest", "icon.svg", "sw.js", "robots.txt", "wrangler.toml",
  "_headers", "schema.sql", "seed.sql", "functions/api/health.js",
  "functions/api/catalog.js", "functions/api/orders.js", "functions/api/orders/[id].js", "functions/api/admin/orders.js", "functions/api/admin/summary.js"
];

const missing = required.filter(file => !existsSync(file));
if (missing.length) throw new Error(`Fichiers manquants: ${missing.join(", ")}`);

for (const file of ["app.js", "data.js", "sw.js", "functions/api/health.js", "functions/api/catalog.js", "functions/api/orders.js", "functions/api/orders/[id].js", "functions/api/admin/orders.js", "functions/api/admin/summary.js"]) {
  execFileSync(process.execPath, ["--check", file], { stdio: "inherit" });
}

const schema = readFileSync("schema.sql", "utf8");
for (const table of ["customers", "products", "inventory", "promotions", "orders", "order_items", "reviews"]) {
  if (!schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    throw new Error(`Table absente du schéma D1: ${table}`);
  }
}

const { onRequestGet: adminOrdersGet } = await import("../functions/api/admin/orders.js");
const unauthorized = await adminOrdersGet({
  request: new Request("https://example.test/api/admin/orders"),
  env: {}
});
if (unauthorized.status !== 401) throw new Error("La route admin doit refuser une requête sans token");

console.log("Apex Gaming smoke check: OK");
