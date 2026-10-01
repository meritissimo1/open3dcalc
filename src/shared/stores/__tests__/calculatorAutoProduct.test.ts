import { beforeEach, describe, expect, it } from "vitest";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useHistoryStore } from "@/shared/stores/historyStore";
import { useProductInventory } from "@/shared/stores/productInventory";

beforeEach(() => {
  localStorage.clear();
  useProductInventory.setState({ products: [] });
  useHistoryStore.setState({ entries: [] });
  useCalculatorStore.getState().resetCalculator();
});

describe("saving a calculation (Buma Labs fork)", () => {
  it("sends the named product to Products with its cost, time and link", () => {
    const store = useCalculatorStore.getState();
    store.setProductName("Chaveiro");
    store.setProductLink("https://example.com/chaveiro");
    store.addToHistory();

    const state = useCalculatorStore.getState();
    const [product] = useProductInventory.getState().products;
    expect(product).toMatchObject({
      name: "Chaveiro",
      link: "https://example.com/chaveiro",
      status: "testing",
      printTimeHours: state.fdmPrintParams.printTimeHours,
    });
    expect(product.costPrice).toBeCloseTo(state.results!.totalCost, 2);
    // The part weight typed in the calculator, not the efficiency-adjusted one.
    expect(product.weightGrams).toBe(state.fdmMaterial.weightUsed);
    expect(product.weightGrams).not.toBe(state.results!.unitWeight);
  });

  it("updates the same product on the next save instead of duplicating", () => {
    const store = useCalculatorStore.getState();
    store.setProductName("Chaveiro");
    store.addToHistory();
    useCalculatorStore
      .getState()
      .setFdmMaterial({
        ...useCalculatorStore.getState().fdmMaterial,
        weightUsed: 80,
      });
    useCalculatorStore.getState().addToHistory();

    const products = useProductInventory.getState().products;
    expect(products).toHaveLength(1);
    expect(products[0].costPrice).toBeCloseTo(
      useCalculatorStore.getState().results!.totalCost,
      2,
    );
  });

  it("skips calculations without a product name", () => {
    useCalculatorStore.getState().addToHistory();
    expect(useProductInventory.getState().products).toHaveLength(0);
  });
});
