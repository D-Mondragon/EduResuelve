import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Field, Input } from './ui/Field'
import { Modal } from './ui/Modal'
import { StatusBadge } from './ui/Badge'

describe('Componentes accesibles', () => {
  it('CP-UI-16: Field enlaza etiqueta, ayuda y error con el control', () => {
    render(
      <Field error="Campo obligatorio" hint="Ayuda" id="nombre" label="Nombre" required>
        <Input />
      </Field>,
    )
    const input = screen.getByLabelText(/Nombre/)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'nombre-hint nombre-error')
    expect(input).toBeRequired()
    expect(screen.getByText('Campo obligatorio')).toBeInTheDocument()
  })

  it('CP-UI-17: Modal enfoca el primer control, atrapa el foco y cierra con Escape', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal footer={<button type="button">Aceptar</button>} onClose={onClose} open title="Confirmar">
        <input aria-label="Motivo" data-autofocus />
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Confirmar' })).toBeInTheDocument()
    expect(screen.getByLabelText('Motivo')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Aceptar' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('CP-UI-18: la insignia de estado muestra texto (no depende solo del color)', () => {
    render(<StatusBadge status="En atención" />)
    expect(screen.getByText('En atención')).toBeInTheDocument()
  })
})
