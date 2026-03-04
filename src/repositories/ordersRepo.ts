import { Order, getOrdersDb } from "@/lib/data";
import { calcTotals } from "@/lib/totals";

export type OrdersQuery = {
  q?: string;
  status?: "pending" | "paid" | "canceled" | "all";
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  sort?: "issuedAt" | "total";
  dir?: "asc" | "desc";
};

export type OrderRow = {
  id: string;
  customerName: string;
  customerRut: string;
  issuedAt: string;
  net: number;
  vat: number;
  total: number;
  status: "pending" | "paid" | "canceled";
};

export type OrdersResponse = {
  data: OrderRow[];
  summary: {
    count: number;
    totalNet: number;
    totalVat: number;
    totalGross: number;
    byStatus: Record<"pending" | "paid" | "canceled", number>;
  };
};

export async function listOrders(_q: OrdersQuery): Promise<OrdersResponse> {
  // 1) Obtener data
  let orders = getOrdersDb();

  // 2) Filtros
  if (_q.status && _q.status !== "all") {
    orders = orders.filter((o) => o.status === _q.status);
  }

  if (_q.q) {
    const search = _q.q.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.id.toLowerCase().includes(search) ||
        o.customerName.toLowerCase().includes(search) ||
        o.customerRut.toLowerCase().includes(search)
    );
  }

  if (_q.from) {
    orders = orders.filter((o) => o.issuedAt >= _q.from!);
  }

  if (_q.to) {
    orders = orders.filter((o) => o.issuedAt <= _q.to!);
  }

  // 3) Mapear a OrderRow
  const rows: OrderRow[] = orders.map((o) => {
    const { net, vat, total } = calcTotals(o);
    return {
      id: o.id,
      customerName: o.customerName,
      customerRut: o.customerRut,
      issuedAt: o.issuedAt,
      net,
      vat,
      total,
      status: o.status,
    };
  });

  // 4) Ordenar
  const sortField = _q.sort ?? "issuedAt";
  const dir = _q.dir ?? "asc";

  rows.sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return dir === "asc" ? -1 : 1;
    if (aVal > bVal) return dir === "asc" ? 1 : -1;
    return 0;
  });

  // 5) Summary
  const byStatus: Record<"pending" | "paid" | "canceled", number> = {
    pending: 0,
    paid: 0,
    canceled: 0,
  };
  let totalNet = 0, totalVat = 0, totalGross = 0;

  for (const row of rows) {
    byStatus[row.status]++;
    totalNet   += row.net;
    totalVat   += row.vat;
    totalGross += row.total;
  }

  return {
    data: rows,
    summary: { count: rows.length, totalNet, totalVat, totalGross, byStatus },
  };
}



export async function payOrder(
  id: string
): Promise<{ ok: true; order: Order } | { ok: false; code: number; error: string }> {
  const db = getOrdersDb();
  const cleanId = String(id).trim();

  const idx = db.findIndex((o) => String(o.id).trim() === cleanId);
  if (idx === -1) return { ok: false, code: 404, error: "Not found" };
  if (db[idx].status === "canceled") return { ok: false, code: 409, error: "Cannot pay a canceled order" };

  db[idx] = { ...db[idx], status: "paid" };
  return { ok: true, order: db[idx] };
}
