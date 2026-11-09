import { httpClient } from './client'
import type { TransactionDetailDTO, TransactionDetailWire } from './contracts/sales'
import { endpoints } from './endpoints'
import { roundMoney } from '../lib/money'

const sum = (values: number[]): number => roundMoney(values.reduce((total, value) => total + value, 0))

/**
 * Maps the Backend detail (PMC-11) to the contract of PMC-25. Fields the Backend has not published yet
 * fall back to what can be derived from the rest: subtotal from the items, change from payments - total.
 */
export function toTransactionDetail(wire: TransactionDetailWire): TransactionDetailDTO {
  const itemsTotal = sum(wire.detalles.map((item) => item.importe))
  const tip = wire.propina ?? 0
  const taxes = wire.impuestos ?? 0
  return {
    id: wire.folio,
    folio: wire.folio,
    paid_at: wire.fecha_cobro ?? '',
    status: 'COMPLETED',
    subtotal: wire.subtotal ?? itemsTotal,
    taxes,
    tip,
    total: wire.total,
    change_given:
      wire.cambio_entregado ?? Math.max(0, roundMoney(sum(wire.desgloses.map((payment) => payment.monto)) - wire.total)),
    items: wire.detalles.map((item) => ({
      dish_name: item.nombre_platillo,
      quantity: item.cantidad,
      unit_price: item.precio_unitario,
      amount: item.importe,
    })),
    payment_breakdowns: wire.desgloses.map((payment) => ({
      payment_method: payment.metodo_pago,
      amount: payment.monto,
      authorization_reference: payment.referencia_autorizacion ?? null,
    })),
  }
}

/** PMC-25 AC1. The modal renders its own error and retry, so no toast per request. */
export async function getTransactionDetail(folio: string, signal?: AbortSignal): Promise<TransactionDetailDTO> {
  const { data } = await httpClient.get<TransactionDetailWire>(endpoints.transactionDetail(folio), {
    skipErrorToast: true,
    signal,
  })
  return toTransactionDetail(data)
}
