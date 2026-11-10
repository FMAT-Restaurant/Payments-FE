import { httpClient } from './client'
import type {
  CashShiftDTO,
  CashShiftSummaryDTO,
  CloseCashShiftRequestDTO,
  CloseCashShiftResponseDTO,
  ForceCloseCashShiftRequestDTO,
  ForceCloseCashShiftResponseDTO,
  OpenCashShiftRequestDTO,
  OpenCashShiftItemDTO,
  OpenCashShiftResponseDTO,
} from './contracts/cashShift'
import { endpoints } from './endpoints'

/** PMC-22 AC1: open shift of the logged-in cashier. A 404 means "no open shift", not an error to show. */
export async function getMyCashShift(): Promise<CashShiftDTO> {
  const { data } = await httpClient.get<CashShiftDTO>(endpoints.myCashShift(), { skipErrorToast: true })
  return data
}

/** PMC-22 AC3: opens the shift with the declared cash fund. 409 CASH_SHIFT_ALREADY_OPEN is shown by the interceptor. */
export async function openCashShift(request: OpenCashShiftRequestDTO): Promise<OpenCashShiftResponseDTO> {
  const { data } = await httpClient.post<OpenCashShiftResponseDTO>(endpoints.openCashShift(), request)
  return data
}

/** PMC-23 AC2: reconciliation of the open shift. A 404 means "no open shift" and the screen explains it itself. */
export async function getCashShiftSummary(): Promise<CashShiftSummaryDTO> {
  const { data } = await httpClient.get<CashShiftSummaryDTO>(endpoints.cashShiftSummary(), { skipErrorToast: true })
  return data
}

/** PMC-23 AC5: closes the shift with the declared cash (and the reason when there is a difference). */
export async function closeCashShift(request: CloseCashShiftRequestDTO): Promise<CloseCashShiftResponseDTO> {
  const { data } = await httpClient.post<CloseCashShiftResponseDTO>(endpoints.closeCashShift(), request)
  return data
}

/** PMC-31 AC2: every open shift of the restaurant. An empty array is a valid answer ("no open shifts"). */
export async function getOpenCashShifts(): Promise<OpenCashShiftItemDTO[]> {
  const { data } = await httpClient.get<OpenCashShiftItemDTO[]>(endpoints.openCashShifts(), { skipErrorToast: true })
  return data
}

/** PMC-31 AC3: reconciliation of someone else's shift. The screen explains 403 and 404 itself. */
export async function getCashShiftSummaryById(cashShiftId: string): Promise<CashShiftSummaryDTO> {
  const { data } = await httpClient.get<CashShiftSummaryDTO>(endpoints.cashShiftSummaryById(cashShiftId), {
    skipErrorToast: true,
  })
  return data
}

/** PMC-31 AC5: forced close. 409 (already closed) and 403 are shown by the interceptor and handled by the screen. */
export async function forceCloseCashShift(
  cashShiftId: string,
  request: ForceCloseCashShiftRequestDTO,
): Promise<ForceCloseCashShiftResponseDTO> {
  const { data } = await httpClient.post<ForceCloseCashShiftResponseDTO>(endpoints.forceCloseCashShift(cashShiftId), request)
  return data
}
