import type {
  ExtraPart,
  ExtraSelection,
  PackagingOption,
} from "@/shared/types";

/**
 * Buma Labs fork: extra parts and packaging are picked from the catalog
 * instead of typed on every calculation. The calculator keeps using the
 * plain `extrasCost` / `packagingCost` numbers; these helpers derive them.
 */

/** Total cost of the picked extra parts, rounded to cents. */
export function extrasTotal(items: readonly ExtraSelection[]): number {
  const sum = items.reduce(
    (acc, item) => acc + item.unitCost * Math.max(0, item.quantity),
    0,
  );
  return Math.round(sum * 100) / 100;
}

/** Labor hourly rate of a fresh catalog; adjustable in Cadastros. */
export const DEFAULT_LABOR_HOURLY_RATE = 50;

/** Packaging sizes seeded into a fresh catalog; prices are set by the team. */
export const DEFAULT_PACKAGINGS: readonly PackagingOption[] = [
  { id: "pkg_p", name: "P", cost: 0, updatedAt: 0 },
  { id: "pkg_m", name: "M", cost: 0, updatedAt: 0 },
  { id: "pkg_g", name: "G", cost: 0, updatedAt: 0 },
  { id: "pkg_gg", name: "GG", cost: 0, updatedAt: 0 },
];

/**
 * Reflects catalog edits (name/price) on the picked extra parts. Returns
 * `null` when nothing changed so callers can skip a store update. Parts
 * removed from the catalog keep their last known values.
 */
export function syncSelections(
  items: readonly ExtraSelection[],
  parts: readonly ExtraPart[],
): ExtraSelection[] | null {
  let changed = false;
  const next = items.map((item) => {
    const part = parts.find((p) => p.id === item.partId);
    if (!part || (part.name === item.name && part.cost === item.unitCost)) {
      return item;
    }
    changed = true;
    return { ...item, name: part.name, unitCost: part.cost };
  });
  return changed ? next : null;
}

/** Adds one unit of `part`, or bumps its quantity when already picked. */
export function addSelection(
  items: readonly ExtraSelection[],
  part: ExtraPart,
): ExtraSelection[] {
  if (items.some((item) => item.partId === part.id)) {
    return items.map((item) =>
      item.partId === part.id ? { ...item, quantity: item.quantity + 1 } : item,
    );
  }
  return [
    ...items,
    { partId: part.id, name: part.name, unitCost: part.cost, quantity: 1 },
  ];
}
