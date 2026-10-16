import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PrintSection } from "../PrintSection";
import type { CalculatorState } from "@/shared/stores/calculatorStore";

const createMockStore = (
  overrides: Partial<CalculatorState> = {},
): CalculatorState =>
  ({
    fdmPrintParams: {
      printTimeHours: 2,
      printerPowerWatts: 200,
      energyCostPerKwh: 0.12,
      failureMode: "percent",
      failureValue: 10,
      riskMultiplier: 1.5,
    },
    resinPrintParams: {
      printTimeHours: 3,
      printerPowerWatts: 100,
      energyCostPerKwh: 0.12,
      failureMode: "none",
      failureValue: 0,
      riskMultiplier: 1,
    },
    selectedPrinter: {
      id: "printer-1",
      name: "Test Printer",
      power: 200,
      value: 2000,
    },
    setFdmPrintParams: vi.fn(),
    setResinPrintParams: vi.fn(),
    ...overrides,
  }) as unknown as CalculatorState;

const mockCatalogPrinters = [
  {
    id: "printer-1",
    name: "Test Printer",
    power: 200,
    value: 2000,
    brand: "Bambu",
  },
];

const defaultProps = {
  renderSectionHeader: vi.fn((_Icon, title) => (
    <div data-testid="section-header">{title}</div>
  )),
  t: (key: string) => key,
  currencySymbol: "R$",
  handleInput: vi.fn(),
  isFDM: true,
  isFieldVisible: vi.fn(() => true),
  handlePrinterSelect: vi.fn(),
  catalogPrinters: mockCatalogPrinters,
};

describe("PrintSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    const store = createMockStore();
    render(<PrintSection {...defaultProps} store={store} />);
    expect(screen.getByTestId("section-header")).toBeInTheDocument();
  });

  it("displays the section title via renderSectionHeader", () => {
    const store = createMockStore();
    render(<PrintSection {...defaultProps} store={store} />);
    expect(screen.getByTestId("section-header")).toHaveTextContent(
      "calc.printParams",
    );
  });

  // Buma Labs fork: on FDM the print time is a text field that reads
  // MakerWorld-style input ("5.3", "30 min").
  it("shows the print time field plus power and energy cost", () => {
    const store = createMockStore();
    render(<PrintSection {...defaultProps} store={store} />);
    expect(
      screen.getByRole("textbox", { name: "calc.printTime" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
  });

  it("reads minutes typed in the print time field", () => {
    const store = createMockStore();
    render(<PrintSection {...defaultProps} store={store} />);
    const field = screen.getByRole("textbox", { name: "calc.printTime" });
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "30 min" } });
    expect(store.setFdmPrintParams).toHaveBeenLastCalledWith(
      expect.objectContaining({ printTimeHours: 0.5 }),
    );
    expect(screen.getByTestId("print-time-reading")).toHaveTextContent(
      "= 30min",
    );
  });

  it("displays FDM print values when isFDM is true", () => {
    const store = createMockStore({
      fdmPrintParams: {
        printTimeHours: 2.5,
        printerPowerWatts: 250,
        energyCostPerKwh: 0.15,
        failureMode: "percent",
        failureValue: 10,
        riskMultiplier: 1.5,
        heatUpTimeMinutes: 5,
        heatUpPowerPercent: 150,
      },
    });
    render(<PrintSection {...defaultProps} isFDM={true} store={store} />);
    expect(screen.getByRole("textbox", { name: "calc.printTime" })).toHaveValue(
      "2.5 h",
    );
    expect(screen.getByTestId("print-time-reading")).toHaveTextContent(
      "= 2h 30min",
    );
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(250);
    expect(inputs[1]).toHaveValue(0.15);
  });

  it("displays resin print values when isFDM is false", () => {
    const store = createMockStore({
      resinPrintParams: {
        printTimeHours: 3.5,
        printerPowerWatts: 120,
        energyCostPerKwh: 0.1,
        failureMode: "none",
        failureValue: 0,
        riskMultiplier: 1,
        heatUpTimeMinutes: 5,
        heatUpPowerPercent: 150,
      },
    });
    render(<PrintSection {...defaultProps} isFDM={false} store={store} />);
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(3.5);
    expect(inputs[1]).toHaveValue(120);
    expect(inputs[2]).toHaveValue(0.1);
  });

  it("shows printer select when FDM and field is visible", () => {
    const store = createMockStore();
    render(
      <PrintSection
        {...defaultProps}
        store={store}
        isFDM={true}
        isFieldVisible={vi.fn(() => true)}
      />,
    );
    expect(screen.getByText("calc.printer")).toBeInTheDocument();
  });

  it("hides printer select when field is not visible", () => {
    const store = createMockStore();
    render(
      <PrintSection
        {...defaultProps}
        store={store}
        isFDM={true}
        isFieldVisible={vi.fn(() => false)}
      />,
    );
    expect(screen.queryByText("calc.printer")).not.toBeInTheDocument();
  });
});

// ── Wave B (B4): seletor → handlePrinterSelect ───────────────────

it("wires selector → setSelectedPrinter with the full printer profile", async () => {
  const setSelectedPrinter = vi.fn();
  const store = createMockStore({ setSelectedPrinter });
  // Replica o wiring real do Calculator.tsx: o handler recebe o id,
  // resolve no catálogo e chama setSelectedPrinter com a impressora.
  const catalog = [
    {
      id: "printer-1",
      name: "Test Printer",
      power: 200,
      value: 2000,
      brand: "Bambu",
    },
    {
      id: "bambu_a1",
      name: "A1",
      power: 220,
      value: 3000,
      brand: "Bambu",
      usefulLife: 3000,
      maintenancePerHour: 0.3,
    },
  ];
  const handlePrinterSelect = (id: string) => {
    const p = catalog.find((p) => p.id === id);
    if (p) setSelectedPrinter(p as never);
  };
  const user = userEvent.setup();
  render(
    <PrintSection
      {...defaultProps}
      store={store}
      isFDM={true}
      isFieldVisible={vi.fn(() => true)}
      handlePrinterSelect={handlePrinterSelect}
      catalogPrinters={catalog}
    />,
  );

  // Abre o combobox e escolhe a segunda impressora
  await user.click(screen.getByRole("combobox"));
  await user.click(screen.getByRole("option", { name: /A1/ }));

  // O seletor dispara o handler, que reacha o store com a impressora
  // completa (profile com power/value/usefulLife/maintenancePerHour).
  expect(setSelectedPrinter).toHaveBeenCalledTimes(1);
  expect(setSelectedPrinter).toHaveBeenCalledWith(
    expect.objectContaining({ id: "bambu_a1", power: 220, value: 3000 }),
  );
});
