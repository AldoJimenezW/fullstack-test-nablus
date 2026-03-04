import { Order } from "./data";

// BUG intencional: el IVA está mal calculado a propósito (el candidato debe corregirlo)
export function calcTotals(o: Order) {
  const vat = o.net * o.vatRate;
  const total = o.net + vat;
  return { net: o.net, vat, total };
}