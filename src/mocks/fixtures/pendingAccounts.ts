import type { PendingAccountCardDTO } from '../../api/contracts/pendingAccounts'

const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

/** Accounts of the mocks (docs/Caja.png and docs/Procesar pago.png). */
export const pendingAccountsFixture = (): PendingAccountCardDTO[] => [
  {
    dinning_session_id: '3f2b8c1e-7a4d-4e9b-b1c2-9d8e7f6a5b40',
    order_folio: '#ORD-9938',
    table_name: 'Mesa 04',
    waiter_name: 'Carlos R.',
    timestamp: minutesAgo(2),
    pre_account_status: 'ACCOUNT_REQUESTED',
    items: [
      { dish_id: 'd-101', name: 'Tacos al Pastor', quantity: 2, unit_price: 60, amount: 120, notes: 'Sin cebolla • Piña aparte' },
      { dish_id: 'd-205', name: 'Cerveza Artesanal', quantity: 1, unit_price: 85, amount: 85, notes: 'Tarro frío' },
    ],
    totals: { subtotal: 205, taxes: 32.8, expected_total: 237.8 },
  },
  {
    dinning_session_id: 'a91c4e27-5d3b-4f60-8e2a-6b7c1d0e9f12',
    order_folio: '#ORD-9939',
    table_name: null,
    waiter_name: null,
    timestamp: minutesAgo(17),
    pre_account_status: 'PRE_ACCOUNT_PRINTED',
    items: [{ dish_id: 'd-310', name: 'Enchiladas Suizas', quantity: 1, unit_price: 150, amount: 150 }],
    totals: { subtotal: 150, taxes: 24, expected_total: 174 },
  },
]
