import { useMutation } from '@tanstack/react-query'
import { exportSales } from '../../api/sales'
import { downloadBlob, filenameFromContentDisposition } from '../../lib/download'
import { rangeEndExclusiveIso, rangeStartIso } from '../../lib/dates'
import { notify } from '../notifications/toastStore'
import { exportRangeError } from './historyFilters'

/** PMC-24 AC5: validates the range (<= 31 days) only here, then downloads the CSV from `/export`. */
export function useSalesExport(start: string, end: string) {
  const mutation = useMutation({
    mutationFn: exportSales,
    onSuccess: ({ blob, contentDisposition }) => {
      const fallback = `historial-ventas_${start}_${end}.csv`
      downloadBlob(blob, filenameFromContentDisposition(contentDisposition, fallback))
    },
  })

  const run = () => {
    const problem = exportRangeError(start, end)
    if (problem) {
      notify.error(problem)
      return
    }
    // The range is valid, so both ISO values exist.
    mutation.mutate({ start_date: rangeStartIso(start) ?? '', end_date: rangeEndExclusiveIso(end) ?? '' })
  }

  return { run, isExporting: mutation.isPending }
}
