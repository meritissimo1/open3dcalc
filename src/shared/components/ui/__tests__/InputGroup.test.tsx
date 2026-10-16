import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { InputGroup } from '../InputGroup'

describe('InputGroup', () => {
  it('renders label and input', () => {
    render(<InputGroup label="Test Label" value="" onChange={vi.fn()} />)
    expect(screen.getByText('Test Label')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('renders number input when type is number', () => {
    render(<InputGroup label="Number" value={42} onChange={vi.fn()} type="number" />)
    const input = screen.getByRole('spinbutton')
    expect(input).toBeInTheDocument()
    expect(input).toHaveValue(42)
  })

  it('calls onChange when input value changes', () => {
    const onChange = vi.fn()
    render(<InputGroup label="Test" value="" onChange={onChange} />)
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'new value' } })
    expect(onChange).toHaveBeenCalledWith('new value')
  })

  it('renders unit suffix when provided', () => {
    render(<InputGroup label="Test" value="" onChange={vi.fn()} unit="kg" />)
    expect(screen.getByText('kg')).toBeInTheDocument()
  })

  it('renders prefix when provided', () => {
    render(<InputGroup label="Test" value="" onChange={vi.fn()} prefix="R$" />)
    expect(screen.getByText('R$')).toBeInTheDocument()
  })

  it('renders placeholder text', () => {
    render(<InputGroup label="Test" value="" onChange={vi.fn()} placeholder="Enter value" />)
    expect(screen.getByPlaceholderText('Enter value')).toBeInTheDocument()
  })

  it('renders error message when provided', () => {
    render(<InputGroup label="Test" value="" onChange={vi.fn()} error="Invalid value" />)
    expect(screen.getByText('Invalid value')).toBeInTheDocument()
  })

  it('renders tooltip icon when tooltip is provided', () => {
    render(<InputGroup label="Test" value="" onChange={vi.fn()} tooltip="Help text" />)
    // Tooltip renders an Info icon
    const infoIcon = document.querySelector('.lucide-info')
    expect(infoIcon).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(
      <InputGroup label="Test" value="" onChange={vi.fn()} className="custom-class" />,
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('custom-class')
  })

  // Buma Labs fork: a cleared number field stays empty while focused.
  describe('number field draft', () => {
    // Mirrors the calculator: "" is stored as 0.
    function Controlled({ initial = 125 }: { initial?: number }) {
      const [value, setValue] = useState(initial)
      return (
        <>
          <InputGroup
            label="Cost"
            type="number"
            value={value}
            onChange={(v) => setValue(v === '' ? 0 : parseFloat(v) || 0)}
          />
          <button onClick={() => setValue(999)}>external</button>
        </>
      )
    }

    it('lets the user clear the field and type from scratch', () => {
      render(<Controlled />)
      const input = screen.getByRole('spinbutton')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '' } })
      expect(input).toHaveValue(null)
      fireEvent.change(input, { target: { value: '120' } })
      expect(input).toHaveValue(120)
      expect((input as HTMLInputElement).value).toBe('120')
    })

    it('shows the stored value again on blur', () => {
      render(<Controlled />)
      const input = screen.getByRole('spinbutton')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.blur(input)
      expect((input as HTMLInputElement).value).toBe('0')
    })

    it('drops the draft when the value changes from outside', () => {
      render(<Controlled />)
      const input = screen.getByRole('spinbutton')
      fireEvent.focus(input)
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.click(screen.getByText('external'))
      expect((input as HTMLInputElement).value).toBe('999')
    })
  })
})
