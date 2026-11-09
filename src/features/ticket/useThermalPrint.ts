import { useLayoutEffect, useRef, useState } from 'react'
import { useReactToPrint } from 'react-to-print'
import { notify } from '../notifications/toastStore'

const PX_PER_MM = 96 / 25.4
/** Extra paper after the last line so the cutter does not trim it. */
const BOTTOM_MARGIN_MM = 6

/**
 * Page style of the 80 mm thermal paper (PMC-21 AC3).
 * `size: 80mm auto` is the rule of the story, but browsers drop it (a length plus `auto` is not a valid
 * `size`) and fall back to Letter/A4. The second declaration, with the measured ticket height, is the one
 * Chrome and Edge apply: a single page exactly as long as the ticket.
 */
export function thermalPageStyle(ticketHeightMm?: number): string {
  const measured = ticketHeightMm ? ` size: 80mm ${Math.ceil(ticketHeightMm + BOTTOM_MARGIN_MM)}mm;` : ''
  return `
  @page { size: 80mm auto;${measured} margin: 0; }
  @media print {
    html, body { width: 80mm; margin: 0; padding: 0; background: #fff; }
    .thermal-ticket { width: 80mm; max-width: 80mm; box-sizing: border-box; color: #000; }
  }
`
}

/**
 * Prints only the ticket node, at 80 mm and without margins (react-to-print).
 * `content` is whatever changes the ticket (e.g. the receipt data), so its height is measured again.
 */
export function useThermalPrint(folio: string | undefined, content?: unknown) {
  const contentRef = useRef<HTMLElement>(null)
  const [heightMm, setHeightMm] = useState<number>()

  useLayoutEffect(() => {
    const height = contentRef.current?.getBoundingClientRect().height ?? 0
    setHeightMm(height > 0 ? height / PX_PER_MM : undefined)
  }, [content])

  const print = useReactToPrint({
    contentRef,
    documentTitle: folio ? `Ticket ${folio}` : 'Ticket',
    pageStyle: thermalPageStyle(heightMm),
    onPrintError: () => notify.error('No se pudo abrir la impresión del ticket. Inténtalo de nuevo.'),
  })

  return { contentRef, print: () => print() }
}
