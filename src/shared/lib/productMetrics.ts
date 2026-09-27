import type { Product, ProductStatus } from "@/shared/types";

/**
 * Buma Labs fork: catalog metrics for the Products tab.
 */

export const PRODUCT_STATUSES: readonly ProductStatus[] = [
  "active",
  "inactive",
  "testing",
  "paused",
];

/** Products saved before statuses existed count as "testing". */
export function productStatus(p: Pick<Product, "status">): ProductStatus {
  return p.status ?? "testing";
}

/**
 * Profit per print hour at `price`, or `null` when it can't be computed
 * (no price set yet or no print time).
 */
export function profitPerHour(
  price: number | undefined,
  cost: number,
  printTimeHours: number | undefined,
): number | null {
  if (!price || price <= 0 || !printTimeHours || printTimeHours <= 0) {
    return null;
  }
  return (price - cost) / printTimeHours;
}

export type ProductSortKey =
  "cost" | "printTime" | "profitInPerson" | "profitOnline";

function sortValue(p: Product, key: ProductSortKey): number | null {
  switch (key) {
    case "cost":
      return p.costPrice;
    case "printTime":
      return p.printTimeHours ?? null;
    case "profitInPerson":
      return profitPerHour(p.inPersonPrice, p.costPrice, p.printTimeHours);
    case "profitOnline":
      return profitPerHour(p.salePrice, p.costPrice, p.printTimeHours);
  }
}

/** Sorts by `key`; products without a value always go last. */
export function sortProducts(
  products: readonly Product[],
  key: ProductSortKey,
  direction: "asc" | "desc",
): Product[] {
  const sign = direction === "asc" ? 1 : -1;
  return [...products].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    return (va - vb) * sign;
  });
}
