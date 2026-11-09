import type { SalesHistoryItemWire, TransactionDetailWire } from '../../api/contracts/sales'
import type { TicketReceiptDTO } from '../../api/contracts/ticket'
import { roundMoney } from '../../lib/money'

const DISHES = ['Tacos al Pastor', 'Cochinita Pibil', 'Agua de Horchata', 'Flan Napolitano'] as const
const TAX_RATE = 0.16

/** Deterministic detail of a history row (PMC-25): items split the subtotal, payments cover the total. */
export function transactionDetailFixture(row: SalesHistoryItemWire): TransactionDetailWire {
  const total = roundMoney(row.total)
  const subtotal = roundMoney(total / (1 + TAX_RATE))
  const taxes = roundMoney(total - subtotal)
  const firstAmount = roundMoney(subtotal * 0.6)
  const items = [
    { nombre_platillo: DISHES[0], cantidad: 2, importe: firstAmount },
    { nombre_platillo: DISHES[total > 300 ? 1 : 2], cantidad: 1, importe: roundMoney(subtotal - firstAmount) },
  ].map((item) => ({ ...item, precio_unitario: roundMoney(item.importe / item.cantidad) }))

  const isCard = row.metodo_pago === 'CARD'
  const received = isCard ? total : Math.ceil(total / 50) * 50
  return {
    folio: row.folio,
    total,
    estado: 'COMPLETED',
    fecha_cobro: row.fecha_cobro,
    subtotal,
    impuestos: taxes,
    propina: 0,
    cambio_entregado: roundMoney(received - total),
    detalles: items,
    desgloses: [
      isCard
        ? { metodo_pago: 'CREDIT_CARD', monto: total, referencia_autorizacion: 'AUTH-987654' }
        : { metodo_pago: 'CASH', monto: received, referencia_autorizacion: null },
    ],
  }
}

export function ticketFixture(detail: TransactionDetailWire): TicketReceiptDTO {
  return {
    header: {
      restaurant_name: 'FMAT-RESTAURANT',
      folio: detail.folio,
      payment_date: detail.fecha_cobro ?? new Date().toISOString(),
      table_name: 'Mesa 4',
      cashier_name: 'Edwing Molina',
    },
    items: detail.detalles.map((item) => ({
      quantity: item.cantidad,
      dish_name: item.nombre_platillo,
      unit_price: item.precio_unitario,
      amount: item.importe,
    })),
    totals: {
      subtotal: detail.subtotal ?? 0,
      taxes: detail.impuestos ?? 0,
      tip: detail.propina ?? 0,
      total: detail.total,
      payments: detail.desgloses.map((payment) => ({
        payment_method: payment.metodo_pago,
        amount: payment.monto,
        authorization_reference: payment.referencia_autorizacion ?? null,
      })),
      change_given: detail.cambio_entregado ?? 0,
    },
  }
}
