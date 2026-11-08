/** Strict financial rounding to 2 decimals, as required by the payment stories (PMC-20, PMC-23). */
export const roundMoney = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  currencyDisplay: 'narrowSymbol',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** Formats an amount as "$1,234.50". */
export const formatCurrency = (value: number): string => currencyFormatter.format(roundMoney(value))
