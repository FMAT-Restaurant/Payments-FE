import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastViewport } from './ToastViewport'
import { notify, TOAST_DURATION_MS, toastStore } from './toastStore'

afterEach(() => {
  act(() => toastStore.setState([]))
  vi.useRealTimers()
})

describe('<ToastViewport />', () => {
  it('announces errors as alerts and other messages as status', () => {
    render(<ToastViewport />)

    act(() => {
      notify.error('No se pudo procesar el pago.')
      notify.success('Cobro completado')
    })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo procesar el pago.')
    expect(screen.getByRole('status')).toHaveTextContent('Cobro completado')
  })

  it('does not stack the same message twice', () => {
    render(<ToastViewport />)

    act(() => {
      notify.warning('Tu sesión ha expirado. Inicia sesión nuevamente.')
      notify.warning('Tu sesión ha expirado. Inicia sesión nuevamente.')
    })

    expect(screen.getAllByText('Tu sesión ha expirado. Inicia sesión nuevamente.')).toHaveLength(1)
  })

  it('can be dismissed by the user', async () => {
    render(<ToastViewport />)
    act(() => {
      notify.info('La cuenta de la Mesa 12 fue removida de la bandeja')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar notificación' }))

    expect(screen.queryByText(/Mesa 12/)).not.toBeInTheDocument()
  })

  it('disappears on its own after the display time', () => {
    vi.useFakeTimers()
    render(<ToastViewport />)
    act(() => {
      notify.info('Sincronizando cambios...')
    })

    act(() => vi.advanceTimersByTime(TOAST_DURATION_MS))

    expect(screen.queryByText('Sincronizando cambios...')).not.toBeInTheDocument()
  })
})
