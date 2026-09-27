import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductInventory } from "../ProductInventory";
import { useProductInventory } from "@/shared/stores/productInventory";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "pt-BR" },
  }),
}));

beforeEach(() => {
  localStorage.clear();
  useProductInventory.setState({ products: [] });
  vi.restoreAllMocks();
});

describe("ProductInventory UI behavior", () => {
  it("renders empty state when no products exist", () => {
    render(<ProductInventory />);
    expect(screen.getByText("products.noProducts")).toBeInTheDocument();
  });

  it("adds a product through the form and shows it in the table", async () => {
    const user = userEvent.setup();
    render(<ProductInventory />);

    await user.click(
      screen.getByRole("button", { name: "products.newProduct" }),
    );
    await user.type(screen.getByLabelText("products.name"), "Suporte Headset");
    await user.type(screen.getByLabelText("products.printTime"), "2");
    await user.type(screen.getByLabelText("products.cost"), "12.5");
    await user.type(screen.getByLabelText("products.inPersonPrice"), "35");
    await user.type(screen.getByLabelText("products.onlinePrice"), "39.9");
    await user.click(screen.getByRole("button", { name: "common.save" }));

    expect(screen.getByText("Suporte Headset")).toBeInTheDocument();
    expect(useProductInventory.getState().products[0]).toMatchObject({
      status: "testing",
      printTimeHours: 2,
      costPrice: 12.5,
      inPersonPrice: 35,
      salePrice: 39.9,
    });
  });

  it("warns (without blocking) when a price is below cost", async () => {
    const user = userEvent.setup();
    render(<ProductInventory />);

    await user.click(
      screen.getByRole("button", { name: "products.newProduct" }),
    );
    await user.type(screen.getByLabelText("products.name"), "Peça Barata");
    await user.type(screen.getByLabelText("products.cost"), "50");
    await user.type(screen.getByLabelText("products.inPersonPrice"), "10");

    // Warn appears live in the form…
    expect(
      await screen.findByText(/products\.belowCostWarn/),
    ).toBeInTheDocument();

    // …but save is NOT blocked.
    await user.click(screen.getByRole("button", { name: "common.save" }));
    expect(screen.getByText("Peça Barata")).toBeInTheDocument();
  });

  it("changes the status inline and filters by status", async () => {
    const user = userEvent.setup();
    const api = useProductInventory.getState();
    api.addProduct({
      name: "Suporte Headset",
      weightGrams: 85,
      filamentType: "PLA",
      costPrice: 12,
      salePrice: 39,
    });
    api.addProduct({
      name: "Vaso Espiral",
      weightGrams: 100,
      filamentType: "PETG",
      costPrice: 8,
      salePrice: 29,
    });
    render(<ProductInventory />);

    await user.selectOptions(
      screen.getByLabelText("products.status: Suporte Headset"),
      "active",
    );
    expect(useProductInventory.getState().products[0].status).toBe("active");

    fireEvent.change(screen.getByLabelText("products.status"), {
      target: { value: "active" },
    });
    expect(screen.getByText("Suporte Headset")).toBeInTheDocument();
    expect(screen.queryByText("Vaso Espiral")).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("products.status"), {
      target: { value: "testing" },
    });
    expect(screen.queryByText("Suporte Headset")).not.toBeInTheDocument();
    expect(screen.getByText("Vaso Espiral")).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    const user = userEvent.setup();
    const api = useProductInventory.getState();
    api.addProduct({
      name: "Suporte Headset",
      weightGrams: 85,
      filamentType: "PLA",
      costPrice: 12,
      salePrice: 39,
    });
    api.addProduct({
      name: "Vaso Espiral",
      weightGrams: 100,
      filamentType: "PETG",
      costPrice: 8,
      salePrice: 29,
    });
    render(<ProductInventory />);

    await user.type(
      screen.getByPlaceholderText("products.searchPlaceholder"),
      "vaso",
    );
    expect(screen.queryByText("Suporte Headset")).not.toBeInTheDocument();
    expect(screen.getByText("Vaso Espiral")).toBeInTheDocument();
  });

  it("sorts by online profit per hour, products without it last", async () => {
    const user = userEvent.setup();
    const api = useProductInventory.getState();
    // (30 - 10) / 2h = 10/h
    api.addProduct({
      name: "Slow",
      weightGrams: 0,
      filamentType: "",
      costPrice: 10,
      salePrice: 30,
      printTimeHours: 2,
    });
    // no price yet
    api.addProduct({
      name: "Draft",
      weightGrams: 0,
      filamentType: "",
      costPrice: 5,
      salePrice: 0,
      printTimeHours: 1,
    });
    // (25 - 5) / 1h = 20/h
    api.addProduct({
      name: "Fast",
      weightGrams: 0,
      filamentType: "",
      costPrice: 5,
      salePrice: 25,
      printTimeHours: 1,
    });
    render(<ProductInventory />);

    await user.click(
      screen.getByRole("button", { name: /products\.profitOnline/ }),
    );

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining("Fast"),
      expect.stringContaining("Slow"),
      expect.stringContaining("Draft"),
    ]);
  });

  it("links the product name when a link is set", () => {
    useProductInventory.getState().addProduct({
      name: "Chaveiro",
      weightGrams: 0,
      filamentType: "",
      costPrice: 3,
      salePrice: 0,
      link: "https://example.com/chaveiro",
    });
    render(<ProductInventory />);
    expect(screen.getByRole("link", { name: /Chaveiro/ })).toHaveAttribute(
      "href",
      "https://example.com/chaveiro",
    );
  });

  it("exports CSV via Blob download", async () => {
    const user = userEvent.setup();
    useProductInventory.getState().addProduct({
      name: "Suporte Headset",
      weightGrams: 85,
      filamentType: "PLA",
      costPrice: 12.5,
      salePrice: 39.9,
    });
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    render(<ProductInventory />);
    await user.click(
      screen.getByRole("button", { name: "products.exportCsv" }),
    );

    expect(createObjectURL).toHaveBeenCalledOnce();
    clickSpy.mockRestore();
  });
});
