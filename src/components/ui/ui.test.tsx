import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Badge, Button, Card, Input, Modal } from '.'

describe('<Button />', () => {
  it.each([
    ['sm', 'h-8'],
    ['md', 'h-10'],
    ['lg', 'h-12'],
  ] as const)('size %s uses the guide height (%s)', (size, heightClass) => {
    render(<Button size={size}>Guardar</Button>)
    expect(screen.getByRole('button', { name: 'Guardar' })).toHaveClass(heightClass)
  })

  it('applies the primary token by default and the secondary variant on demand', () => {
    render(
      <>
        <Button>Confirmar cobro</Button>
        <Button variant="secondary">Exportar CSV</Button>
      </>,
    )
    expect(screen.getByRole('button', { name: 'Confirmar cobro' })).toHaveClass('bg-primary', 'text-white')
    expect(screen.getByRole('button', { name: 'Exportar CSV' })).toHaveClass('border-primary', 'text-primary')
  })

  it('blocks double clicks while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Confirmar cobro
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Confirmar cobro' })

    await userEvent.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('is type="button" unless told otherwise, so it never submits forms by accident', () => {
    render(<Button>Cancelar</Button>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })
})

describe('<Input />', () => {
  it('links the visible label, helper text and required mark', () => {
    render(<Input label="Fondo inicial en efectivo" helperText="Se suma al arqueo" required placeholder="$ 0.00" />)

    const input = screen.getByLabelText(/Fondo inicial en efectivo/)
    expect(input).toBeRequired()
    expect(input).toHaveAccessibleDescription('Se suma al arqueo')
    expect(input).not.toHaveAttribute('aria-invalid')
  })

  it('shows the error next to the field and marks it invalid', () => {
    render(<Input label="Monto" errorMessage="Ingresa un monto mayor o igual a 0" />)

    const input = screen.getByLabelText('Monto')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Ingresa un monto mayor o igual a 0')
    expect(input).toHaveClass('border-error')
  })

  it('supports the LG size (48px)', () => {
    render(<Input label="Efectivo" size="lg" />)
    expect(screen.getByLabelText('Efectivo')).toHaveClass('h-12')
  })
})

describe('<Card /> and <Badge />', () => {
  it('renders a white card with border and 12px radius tokens', () => {
    render(<Card data-testid="card">Contenido</Card>)
    expect(screen.getByTestId('card')).toHaveClass('bg-surface', 'border-border', 'rounded-card')
  })

  it('renders state badges with text and optional dot', () => {
    render(
      <Badge variant="success" withDot>
        Completado
      </Badge>,
    )
    expect(screen.getByText('Completado')).toHaveClass('bg-success-soft', 'text-success')
  })
})

function ModalHarness({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir</Button>
      <Modal
        open={open}
        title="Confirmar cierre"
        onClose={onClose ? () => (onClose(), setOpen(false)) : undefined}
        footer={<Button onClick={() => setOpen(false)}>Cerrar ventana</Button>}
      >
        <Input label="Motivo" />
      </Modal>
    </>
  )
}

describe('<Modal />', () => {
  it('moves focus inside, closes with Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHarness onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(screen.getByRole('dialog', { name: 'Confirmar cierre' })).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Abrir' })).toHaveFocus()
  })

  it('keeps Tab navigation inside the dialog', async () => {
    const user = userEvent.setup()
    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))

    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar ventana' })).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Motivo')).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Cerrar ventana' })).toHaveFocus()
  })

  it('closes on overlay click only when it is dismissible', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const { unmount } = render(<ModalHarness onClose={onClose} />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByTestId('modal-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
    unmount()

    render(<ModalHarness />)
    await user.click(screen.getByRole('button', { name: 'Abrir' }))
    await user.click(screen.getByTestId('modal-overlay'))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
