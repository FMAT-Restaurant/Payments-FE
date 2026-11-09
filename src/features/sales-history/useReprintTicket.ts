import { useQuery } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { queryKeys } from '../../api/queryKeys'
import { getTicket } from '../../api/tickets'
import { notify } from '../notifications/toastStore'
import { useThermalPrint } from '../ticket/useThermalPrint'

/**
 * PMC-25 AC2: the receipt is requested only when "Reimprimir ticket" is pressed (`GET /{folio}/ticket`),
 * loaded into the receipt component and printed at 80 mm without touching the modal.
 */
export function useReprintTicket(folio: string) {
  const ticket = useQuery({
    queryKey: queryKeys.ticket(folio),
    queryFn: () => getTicket(folio),
    enabled: false,
    retry: false,
  })
  const { contentRef, print } = useThermalPrint(folio, ticket.data)
  const [requested, setRequested] = useState(false)
  const printRef = useRef(print)
  useEffect(() => {
    printRef.current = print
  })

  // Waits one tick after the receipt renders so the hook has measured its height before printing.
  useEffect(() => {
    if (!requested || !ticket.data) return
    const timer = setTimeout(() => {
      printRef.current()
      setRequested(false)
    }, 0)
    return () => clearTimeout(timer)
  }, [requested, ticket.data])

  const reprint = async () => {
    setRequested(true)
    const result = await ticket.refetch()
    if (result.isError) {
      setRequested(false)
      notify.error('No se pudo cargar el ticket. Inténtalo de nuevo.')
    }
  }

  return { contentRef, ticket: ticket.data, reprint, isLoading: ticket.isFetching }
}
