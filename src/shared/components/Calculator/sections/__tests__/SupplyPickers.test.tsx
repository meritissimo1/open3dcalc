import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "@/shared/i18n/i18n";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useCatalogStore } from "@/shared/stores/catalogStore";
import { ExtrasPicker, PackagingPicker } from "../SupplyPickers";

beforeEach(async () => {
  localStorage.clear();
  await i18n.changeLanguage("pt-BR");
  useCatalogStore.getState().load();
  useCalculatorStore.getState().resetCalculator();
});

describe("ExtrasPicker", () => {
  it("points to the catalog when no extra part is registered", () => {
    render(<ExtrasPicker />);
    expect(
      screen.getByText(/Nenhuma peça extra cadastrada/),
    ).toBeInTheDocument();
  });

  it("picks registered parts, edits quantities and removes them", async () => {
    const user = userEvent.setup();
    useCatalogStore.getState().addExtraPart({ name: "Switch", cost: 1.25 });
    useCatalogStore.getState().addExtraPart({ name: "Corrente", cost: 0.6 });
    render(<ExtrasPicker />);

    await user.click(screen.getByRole("combobox", { name: "Peças e Extras" }));
    await user.click(screen.getByRole("option", { name: /Switch/ }));
    fireEvent.change(
      screen.getByRole("spinbutton", { name: "Quantidade de Switch" }),
      { target: { value: "4" } },
    );
    await user.click(screen.getByRole("combobox", { name: "Peças e Extras" }));
    await user.click(screen.getByRole("option", { name: /Corrente/ }));

    expect(useCalculatorStore.getState().fdmExtras.extrasCost).toBe(5.6);
    expect(screen.getByTestId("extras-total")).toHaveTextContent("5,60");

    await user.click(screen.getByRole("button", { name: "Remover Switch" }));
    expect(useCalculatorStore.getState().fdmExtras.extrasCost).toBe(0.6);
  });

  it("follows price edits made in the catalog", () => {
    useCatalogStore.getState().addExtraPart({ name: "Corrente", cost: 0.6 });
    const part = useCatalogStore.getState().extraParts[0];
    useCalculatorStore
      .getState()
      .setExtraSelections([
        { partId: part.id, name: part.name, unitCost: part.cost, quantity: 2 },
      ]);
    render(<ExtrasPicker />);

    act(() => useCatalogStore.getState().updateExtraPart(part.id, { cost: 1 }));
    expect(useCalculatorStore.getState().fdmExtras.extrasCost).toBe(2);
  });
});

describe("PackagingPicker", () => {
  it("sets the packaging cost from the picked size", async () => {
    const user = userEvent.setup();
    const [small] = useCatalogStore.getState().packagings;
    useCatalogStore.getState().updatePackaging(small.id, { cost: 1.8 });
    render(<PackagingPicker />);

    await user.click(screen.getByRole("combobox", { name: "Embalagem" }));
    await user.click(screen.getByRole("option", { name: /^P\b/ }));

    expect(useCalculatorStore.getState().packagingId).toBe(small.id);
    expect(useCalculatorStore.getState().fdmSales.packagingCost).toBe(1.8);
  });
});
