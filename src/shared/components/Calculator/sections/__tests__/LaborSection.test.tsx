import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LaborSection } from '../LaborSection'
import type { CalculatorState } from '@/shared/stores/calculatorStore'

const createMockStore = (overrides: Partial<CalculatorState> = {}): CalculatorState =>
	({
		fdmLabor: {
			enabled: true,
			setupTimeMinutes: 15,
			postProcessingTimeMinutes: 20,
			hourlyRate: 25,
		},
		resinLabor: {
			enabled: true,
			setupTimeMinutes: 10,
			postProcessingTimeMinutes: 15,
			hourlyRate: 25,
		},
		setFdmLabor: vi.fn(),
		setResinLabor: vi.fn(),
		...overrides,
	}) as unknown as CalculatorState

const defaultProps = {
	renderSectionHeader: vi.fn((_Icon, title) => (
		<div data-testid="section-header">{title}</div>
	)),
	t: (key: string) => key,
	currencySymbol: 'R$',
	handleInput: vi.fn(),
	isFDM: true,
}

describe('LaborSection', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('renders without crashing', () => {
		const store = createMockStore()
		render(<LaborSection {...defaultProps} store={store} />)
		expect(screen.getByTestId('section-header')).toBeInTheDocument()
	})

	it('displays the section title via renderSectionHeader', () => {
		const store = createMockStore()
		render(<LaborSection {...defaultProps} store={store} />)
		expect(screen.getByTestId('section-header')).toHaveTextContent('calc.labor')
	})

	it('shows three input fields (setup, post, hourly) for resin', () => {
		const store = createMockStore()
		render(<LaborSection {...defaultProps} isFDM={false} store={store} />)
		const inputs = screen.getAllByRole('spinbutton')
		expect(inputs.length).toBe(3)
	})

	// Buma Labs fork: FDM labor is a category + per-piece time at the
	// catalog hourly rate (see LaborFields tests).
	it('shows category and labor time for FDM', () => {
		const store = createMockStore()
		render(<LaborSection {...defaultProps} isFDM={true} store={store} />)
		expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
		expect(screen.getByRole('combobox')).toBeInTheDocument()
	})

	it('displays resin labor values when isFDM is false', () => {
		const store = createMockStore({
			resinLabor: {
				enabled: true,
				setupTimeMinutes: 10,
				postProcessingTimeMinutes: 15,
				hourlyRate: 25,
			},
		})
		render(<LaborSection {...defaultProps} isFDM={false} store={store} />)
		const inputs = screen.getAllByRole('spinbutton')
		expect(inputs[0]).toHaveValue(10)
		expect(inputs[1]).toHaveValue(15)
		expect(inputs[2]).toHaveValue(25)
	})
})
