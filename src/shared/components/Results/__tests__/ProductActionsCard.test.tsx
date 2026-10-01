import { describe, it, expect, beforeEach, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProductActionsCard } from "../ProductActionsCard";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useFilamentInventory } from "@/shared/stores/filamentInventory";
import { useProductInventory } from "@/shared/stores/productInventory";
import type { CalculationResult } from "@/shared/types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: "pt-BR", language: "pt-BR" },
  }),
}));

const baseResults: CalculationResult = {
  materialCost: 10,
  energyCost: 2,
  machineCost: 3,
  hardwareCost: 1,
  consumablesCost: 1,
  laborCost: 20,
  softwareCost: 1,
  failureCost: 0,
  extrasCost: 2,
  postProcessingCost: 0,
  subtotal: 40,
  totalCost: 60,
  sellPrice: 105.88,
  profit: 30,
  marketplaceFee: 5.29,
  taxAmount: 10.59,
  costPerGram: 0.1,
  costPerUnit: 60,
  unitWeight: 85,
  estimatedPrintTime: 5,
  targetMarginPercent: 50,
  breakEvenPrice: 60,
  actualMargin: 28.33,
  carbonFootprintGrams: 100,
  profitPerHour: 6,
  totalHoursForProfit: 5,
};

function seedStore(productName = "Vaso Teste") {
  useCalculatorStore.setState({
    activeTab: "fdm",
    productName,
    selectedSpoolId: null,
    fdmMaterial: { type: "PLA", weightUsed: 80 } as never,
    resinMaterial: { type: "Standard" } as never,
    results: { ...baseResults },
  } as Partial<ReturnType<typeof useCalculatorStore.getState>>);
  useFilamentInventory.setState({
    spools: [
      {
        id: "s1",
        brand: "MarcaX",
        material: "PLA",
        color: "Preto",
        colorHex: "#111111",
        weightGrams: 1000,
        originalWeightGrams: 1000,
        costPerKg: 120,
        diameterMm: 1.75,
        dateAdded: Date.now(),
        notes: "",
        status: "in_stock",
        purchaseStore: "",
      },
    ],
  });
  useProductInventory.setState({ products: [] });
}

beforeEach(() => {
  localStorage.clear();
  seedStore();
  vi.restoreAllMocks();
});

describe("ProductActionsCard", () => {
  // Buma Labs fork: prices are manual in the Products tab; registering only
  // fills the calculated fields (cost, weight, print time).
  it("registers a product with its cost and no prices yet", async () => {
    const user = userEvent.setup();
    render(<ProductActionsCard displaySellPrice={105.88} />);

    await user.click(
      screen.getByRole("button", { name: "results.registerProduct" }),
    );

    const products = useProductInventory.getState().products;
    expect(products).toHaveLength(1);
    expect(products[0].name).toBe("Vaso Teste");
    expect(products[0].costPrice).toBe(60);
    expect(products[0].salePrice).toBe(0);
    expect(products[0].status).toBe("testing");
    // Buma Labs fork: the part weight typed in the calculator, not the
    // spool-efficiency-adjusted unit weight (85 in this fixture).
    expect(products[0].weightGrams).toBe(80);
  });

  it("announces success and offers the inventory shortcut", async () => {
    const user = userEvent.setup();
    render(<ProductActionsCard displaySellPrice={105.88} />);

    await user.click(
      screen.getByRole("button", { name: "results.registerProduct" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "results.productRegistered",
    );
    expect(screen.getByText("results.viewProducts")).toBeInTheDocument();
  });

  it("prompts for a name when the product name is empty", async () => {
    const user = userEvent.setup();
    seedStore("");
    const prompt = vi.spyOn(window, "prompt").mockReturnValue("Nome Prompt");
    render(<ProductActionsCard displaySellPrice={105.88} />);

    await user.click(
      screen.getByRole("button", { name: "results.registerProduct" }),
    );

    expect(prompt).toHaveBeenCalled();
    expect(useProductInventory.getState().products[0].name).toBe("Nome Prompt");
  });

  it("aborts registration when the name prompt is cancelled", async () => {
    const user = userEvent.setup();
    seedStore("");
    vi.spyOn(window, "prompt").mockReturnValue(null);
    render(<ProductActionsCard displaySellPrice={105.88} />);

    await user.click(
      screen.getByRole("button", { name: "results.registerProduct" }),
    );

    expect(useProductInventory.getState().products).toHaveLength(0);
  });

  it("updates the product with the same name instead of duplicating it", async () => {
    const user = userEvent.setup();
    useProductInventory.setState({
      products: [
        {
          id: "p1",
          name: "Vaso Teste",
          costPrice: 1,
          salePrice: 1,
          weightGrams: 1,
          filamentType: "PLA",
          sold: false,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        },
      ],
    });
    render(<ProductActionsCard displaySellPrice={105.88} />);

    await user.click(
      screen.getByRole("button", { name: "results.registerProduct" }),
    );

    const products = useProductInventory.getState().products;
    expect(products).toHaveLength(1);
    expect(products[0].costPrice).toBe(60);
    // Manual price is kept.
    expect(products[0].salePrice).toBe(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "results.productUpdated",
    );
  });

  it("adds the current calculation to the history", async () => {
    const user = userEvent.setup();
    const addToHistory = vi.spyOn(
      useCalculatorStore.getState(),
      "addToHistory",
    );
    render(<ProductActionsCard displaySellPrice={105.88} />);

    await user.click(
      screen.getByRole("button", { name: "calc.addHistory" }),
    );

    expect(addToHistory).toHaveBeenCalledTimes(1);
  });

  // Buma Labs fork: the save button confirms in place.
  it("confirms a save, then goes back to the normal label", () => {
    vi.useFakeTimers();
    try {
      let n = 0;
      useCalculatorStore.setState({
        lastHistoryKey: null,
        addToHistory: () =>
          useCalculatorStore.setState({ lastHistoryKey: `key-${++n}` }),
      });
      render(<ProductActionsCard displaySellPrice={105.88} />);

      fireEvent.click(screen.getByRole("button", { name: "calc.addHistory" }));
      const button = screen.getByRole("button", { name: "results.saved" });
      expect(button).toHaveAttribute("data-state", "saved");

      act(() => vi.advanceTimersByTime(2000));
      expect(
        screen.getByRole("button", { name: "calc.addHistory" }),
      ).toHaveAttribute("data-state", "idle");
    } finally {
      vi.useRealTimers();
    }
  });

  it("says when the calculation was already saved", () => {
    useCalculatorStore.setState({
      lastHistoryKey: "same",
      // An identical calculation: the store skips it and keeps the key.
      addToHistory: () => undefined,
    });
    render(<ProductActionsCard displaySellPrice={105.88} />);

    fireEvent.click(screen.getByRole("button", { name: "calc.addHistory" }));
    expect(
      screen.getByRole("button", { name: "results.alreadySaved" }),
    ).toHaveAttribute("data-state", "already");
  });

  it("translates an insufficient-stock error from history save", async () => {
    const user = userEvent.setup();
    const error = Object.assign(new Error("INSUFFICIENT_FILAMENT_STOCK"), {
      code: "INSUFFICIENT_FILAMENT_STOCK",
      required: 255,
      available: 1,
    });
    vi.spyOn(useCalculatorStore.getState(), "addToHistory").mockImplementation(
      () => {
        throw error;
      },
    );
    render(<ProductActionsCard displaySellPrice={105.88} />);

    await user.click(
      screen.getByRole("button", { name: "calc.addHistory" }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "results.insufficientStock",
    );
  });
});
