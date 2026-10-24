export async function onRequest() {
  return Response.json({
    ok: true,
    service: "apex-gaming",
    mode: "static-fallback",
    timestamp: new Date().toISOString()
  });
}
