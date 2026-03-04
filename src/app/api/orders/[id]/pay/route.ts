import { CORS_HEADERS } from "@/lib/cors";
import { payOrder } from "@/repositories/ordersRepo";

const JSON_HEADERS = { "Content-Type": "application/json", ...CORS_HEADERS };

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // 1) await ctx.params
  const { id: rawId } = await ctx.params;

  // 2) sanitizar
  const id = decodeURIComponent(rawId).trim();

  // 3) llamar payOrder
  const res = await payOrder(id);

  // 4) error
  if (!res.ok) {
    return new Response(JSON.stringify({ error: res.error }), {
      status: res.code,
      headers: JSON_HEADERS,
    });
  }

  // 5) ok
  return new Response(JSON.stringify({ ok: true, order: res.order }), {
    status: 200,
    headers: JSON_HEADERS,
  });
}