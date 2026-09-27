import { create } from "zustand";
import { persist } from "zustand/middleware";
import { manifestStorage } from "@/shared/lib/manifestStorage";
import type { Product, ProductFormData } from "@/shared/types";

/** Fields the calculator fills in on a product. */
export type CalculatedProduct = Pick<
  ProductFormData,
  "name" | "weightGrams" | "filamentType" | "costPrice"
> & { printTimeHours: number; link?: string };

const normalizeName = (name: string) =>
  name.trim().toLowerCase().replace(/\s+/g, " ");

function generateId(): string {
  return `prod_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** True when the sale price is below cost. Warn-only — never blocks saving. */
export function isBelowCost(
  p: Pick<Product, "costPrice" | "salePrice">,
): boolean {
  return p.salePrice < p.costPrice;
}

function escapeCsvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportProductsCSV(): string {
  const header =
    "id,name,weightGrams,filamentType,costPrice,salePrice,sold,createdAt,updatedAt,status,link,printTimeHours,inPersonPrice";
  const rows = useProductInventory
    .getState()
    .products.map((p) =>
      [
        p.id,
        p.name,
        p.weightGrams,
        p.filamentType,
        p.costPrice,
        p.salePrice,
        p.sold ? 1 : 0,
        p.createdAt,
        p.updatedAt,
        p.status ?? "testing",
        p.link ?? "",
        p.printTimeHours ?? "",
        p.inPersonPrice ?? "",
      ]
        .map(escapeCsvCell)
        .join(","),
    );
  return [header, ...rows].join("\n");
}

interface ProductInventoryState {
  products: Product[];

  addProduct: (data: ProductFormData) => string;
  updateProduct: (id: string, data: Partial<ProductFormData>) => void;
  removeProduct: (id: string) => void;
  markSold: (id: string, sold: boolean) => void;
  /**
   * Buma Labs fork: saves a calculated product. Matches an existing product
   * by name (case/space-insensitive) and refreshes its calculated fields,
   * keeping the manual ones (status, prices); otherwise creates it as
   * "testing" with no prices yet. Returns the product id.
   */
  upsertFromCalculator: (data: CalculatedProduct) => string;

  getProduct: (id: string) => Product | undefined;
  searchProducts: (query: string) => Product[];
  getAllProducts: () => Product[];
}

export const useProductInventory = create<ProductInventoryState>()(
  persist(
    (set, get) => ({
      products: [],

      addProduct: (data) => {
        const name = data.name.trim();
        if (name.length < 2) {
          throw new Error("Name must be at least 2 characters");
        }
        const now = Date.now();
        const id = generateId();
        const product: Product = {
          id,
          name,
          weightGrams: data.weightGrams || 0,
          filamentType: data.filamentType || "",
          costPrice: data.costPrice || 0,
          salePrice: data.salePrice || 0,
          sold: false,
          createdAt: now,
          updatedAt: now,
          status: data.status ?? "testing",
          ...(data.link ? { link: data.link } : {}),
          ...(data.printTimeHours !== undefined
            ? { printTimeHours: data.printTimeHours }
            : {}),
          ...(data.inPersonPrice !== undefined
            ? { inPersonPrice: data.inPersonPrice }
            : {}),
        };
        set((state) => ({ products: [...state.products, product] }));
        return id;
      },

      updateProduct: (id, data) => {
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id
              ? {
                  ...p,
                  ...(data.name !== undefined ? { name: data.name } : {}),
                  ...(data.weightGrams !== undefined
                    ? { weightGrams: data.weightGrams }
                    : {}),
                  ...(data.filamentType !== undefined
                    ? { filamentType: data.filamentType }
                    : {}),
                  ...(data.costPrice !== undefined
                    ? { costPrice: data.costPrice }
                    : {}),
                  ...(data.salePrice !== undefined
                    ? { salePrice: data.salePrice }
                    : {}),
                  ...(data.status !== undefined ? { status: data.status } : {}),
                  ...(data.link !== undefined ? { link: data.link } : {}),
                  ...(data.printTimeHours !== undefined
                    ? { printTimeHours: data.printTimeHours }
                    : {}),
                  ...(data.inPersonPrice !== undefined
                    ? { inPersonPrice: data.inPersonPrice }
                    : {}),
                  updatedAt: Date.now(),
                }
              : p,
          ),
        }));
      },

      removeProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      markSold: (id, sold) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, sold, updatedAt: Date.now() } : p,
          ),
        })),

      upsertFromCalculator: (data) => {
        const key = normalizeName(data.name);
        const existing = get().products.find(
          (p) => normalizeName(p.name) === key,
        );
        if (!existing) {
          return get().addProduct({
            ...data,
            salePrice: 0,
            inPersonPrice: 0,
            status: "testing",
          });
        }
        get().updateProduct(existing.id, {
          weightGrams: data.weightGrams,
          filamentType: data.filamentType,
          costPrice: data.costPrice,
          printTimeHours: data.printTimeHours,
          ...(data.link ? { link: data.link } : {}),
        });
        return existing.id;
      },

      getProduct: (id) => get().products.find((p) => p.id === id),

      searchProducts: (query) => {
        const { products } = get();
        if (!query) return [...products];
        const q = query.toLowerCase();
        return products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.filamentType && p.filamentType.toLowerCase().includes(q)),
        );
      },

      getAllProducts: () => [...get().products],
    }),
    {
      name: "open3dcalc_products",
      version: 1,
      storage: manifestStorage(),
    },
  ),
);
