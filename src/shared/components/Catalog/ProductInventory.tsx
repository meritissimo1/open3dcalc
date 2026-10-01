import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  useProductInventory,
  exportProductsCSV,
} from "@/shared/stores/productInventory";
import { ConfirmDialog } from "@/shared/components/ui/ConfirmDialog";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ExternalLink,
  Package,
  Plus,
  Pencil,
  Trash2,
  Search,
  Download,
} from "lucide-react";
import type { Product, ProductStatus } from "@/shared/types";
import { downloadBlob } from "@/shared/lib/download";
import { formatWeight } from "@/shared/lib/format";
import {
  PRODUCT_STATUSES,
  productStatus,
  profitPerHour,
  sortProducts,
  type ProductSortKey,
} from "@/shared/lib/productMetrics";
import { DemoExportBadge } from "@/shared/components/DemoMode/DemoExportBadge";
import { useCurrency } from "@/shared/hooks/useCurrency";

interface ProductFormState {
  name: string;
  link: string;
  status: ProductStatus;
  printTimeHours: string;
  weightGrams: string;
  costPrice: string;
  inPersonPrice: string;
  salePrice: string;
}

interface ProductFormValues {
  name: string;
  link: string;
  status: ProductStatus;
  printTimeHours: number;
  weightGrams: number;
  costPrice: number;
  inPersonPrice: number;
  salePrice: number;
}

const EMPTY_FORM: ProductFormState = {
  name: "",
  link: "",
  status: "testing",
  printTimeHours: "",
  weightGrams: "",
  costPrice: "",
  inPersonPrice: "",
  salePrice: "",
};

const toNumber = (s: string): number => {
  const n = parseFloat(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

/** Warn-only: a price that was set but doesn't cover the cost. */
const belowCost = (price: number | undefined, cost: number) =>
  !!price && price > 0 && price < cost;

const STATUS_BADGE: Record<ProductStatus, string> = {
  active: "bg-[var(--positive-subtle)] text-[var(--positive)]",
  inactive: "bg-[var(--surface-sunken)] text-[var(--text-secondary)]",
  testing: "bg-[var(--info-subtle)] text-[var(--info)]",
  paused: "bg-[var(--warning-subtle)] text-[var(--warning)]",
};

function ProductFormModal({
  product,
  onClose,
  onSave,
}: {
  product: Product | null;
  onClose: () => void;
  onSave: (data: ProductFormValues) => void;
}) {
  const { t } = useTranslation();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProductFormState>(() =>
    product
      ? {
          name: product.name,
          link: product.link ?? "",
          status: productStatus(product),
          printTimeHours: String(product.printTimeHours ?? ""),
          weightGrams: product.weightGrams ? String(product.weightGrams) : "",
          costPrice: String(product.costPrice),
          inPersonPrice: product.inPersonPrice
            ? String(product.inPersonPrice)
            : "",
          salePrice: product.salePrice ? String(product.salePrice) : "",
        }
      : EMPTY_FORM,
  );

  // The parent remounts this modal (via `key`) on every open, so the
  // useState initializer above always starts from the current product.
  // This effect only syncs focus with the DOM (an external system).
  useEffect(() => {
    const timer = setTimeout(() => nameInputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, []);

  const cost = toNumber(form.costPrice);
  const warnBelowCost =
    belowCost(toNumber(form.salePrice), cost) ||
    belowCost(toNumber(form.inPersonPrice), cost);
  const canSave = form.name.trim().length >= 2;

  const handleSubmit = () => {
    if (!canSave) return;
    onSave({
      name: form.name.trim(),
      link: form.link.trim(),
      status: form.status,
      printTimeHours: toNumber(form.printTimeHours),
      weightGrams: toNumber(form.weightGrams),
      costPrice: cost,
      inPersonPrice: toNumber(form.inPersonPrice),
      salePrice: toNumber(form.salePrice),
    });
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none";
  const labelCls =
    "block text-xs font-medium text-[var(--color-text-secondary)] mb-1";

  const numberField = (
    id: string,
    label: string,
    key:
      | "printTimeHours"
      | "weightGrams"
      | "costPrice"
      | "inPersonPrice"
      | "salePrice",
  ) => (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        className={inputCls}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={
        product ? t("products.editProduct") : t("products.newProduct")
      }
    >
      <div
        className="surface rounded-xl p-6 w-[90%] max-w-md max-h-[85vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-[var(--color-text-primary)] mb-4">
          {product ? t("products.editProduct") : t("products.newProduct")}
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="product-name" className={labelCls}>
              {t("products.name")}
            </label>
            <input
              id="product-name"
              ref={nameInputRef}
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="product-link" className={labelCls}>
              {t("products.link")}
            </label>
            <input
              id="product-link"
              type="url"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="https://"
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label htmlFor="product-status" className={labelCls}>
                {t("products.status")}
              </label>
              <select
                id="product-status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as ProductStatus })
                }
                className={inputCls}
              >
                {PRODUCT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`products.statuses.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            {numberField(
              "product-print-time",
              t("products.printTime"),
              "printTimeHours",
            )}
            {numberField("product-weight", t("products.weight"), "weightGrams")}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {numberField("product-cost", t("products.cost"), "costPrice")}
            {numberField(
              "product-in-person",
              t("products.inPersonPrice"),
              "inPersonPrice",
            )}
            {numberField(
              "product-online",
              t("products.onlinePrice"),
              "salePrice",
            )}
          </div>
          {warnBelowCost && (
            <p
              role="status"
              className="flex items-center gap-1.5 text-xs text-amber-400"
            >
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              {t("products.belowCostWarn")}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="px-4 py-2 rounded-xl bg-[var(--accent-fill)] text-white text-sm font-medium hover:bg-[var(--accent-fill-hover)] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
}: {
  label: string;
  sortKey: ProductSortKey;
  sort: { key: ProductSortKey; direction: "asc" | "desc" } | null;
  onSort: (key: ProductSortKey) => void;
}) {
  const active = sort?.key === sortKey;
  const Icon = !active
    ? ArrowUpDown
    : sort.direction === "asc"
      ? ArrowUp
      : ArrowDown;
  return (
    <th
      className="py-2 pr-3"
      aria-sort={
        active
          ? sort.direction === "asc"
            ? "ascending"
            : "descending"
          : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none rounded"
      >
        {label}
        <Icon className="w-3 h-3" aria-hidden="true" />
      </button>
    </th>
  );
}

export function ProductInventory() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const products = useProductInventory((s) => s.products);
  const addProduct = useProductInventory((s) => s.addProduct);
  const updateProduct = useProductInventory((s) => s.updateProduct);
  const removeProduct = useProductInventory((s) => s.removeProduct);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ProductStatus>(
    "all",
  );
  const [sort, setSort] = useState<{
    key: ProductSortKey;
    direction: "asc" | "desc";
  } | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (statusFilter !== "all" && productStatus(p) !== statusFilter)
        return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.filamentType && p.filamentType.toLowerCase().includes(q))
      );
    });
    return sort ? sortProducts(filtered, sort.key, sort.direction) : filtered;
  }, [products, search, statusFilter, sort]);

  // Higher is usually what matters for profit; lower for cost and time.
  const handleSort = (key: ProductSortKey) =>
    setSort((prev) =>
      prev?.key === key
        ? { key, direction: prev.direction === "asc" ? "desc" : "asc" }
        : {
            key,
            direction:
              key === "profitInPerson" || key === "profitOnline"
                ? "desc"
                : "asc",
          },
    );

  const handleSave = (data: ProductFormValues) => {
    if (editing) updateProduct(editing.id, data);
    else addProduct({ ...data, filamentType: "" });
    setEditing(null);
    setFormOpen(false);
  };

  const handleExportCsv = () => {
    downloadBlob(
      new Blob([exportProductsCSV()], { type: "text/csv;charset=utf-8" }),
      "products.csv",
    );
  };

  const money = (value: number | undefined) =>
    value && value > 0 ? format(value) : "—";
  const perHour = (value: number | null) =>
    value === null ? "—" : `${format(value)}/h`;

  return (
    <div className="surface rounded-xl p-5 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-[var(--color-border)] pb-3">
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-[var(--color-accent)]" />
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {t("products.title")}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              {t("products.subtitle")}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
          >
            <Download className="w-4 h-4" />
            {t("products.exportCsv")}
          </button>
          <button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-fill)] text-white text-sm font-medium hover:bg-[var(--accent-fill-hover)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
          >
            <Plus className="w-4 h-4" />
            {t("products.newProduct")}
          </button>
        </div>
      </div>

      <DemoExportBadge />

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("products.searchPlaceholder")}
            aria-label={t("products.searchPlaceholder")}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
          />
        </div>
        <select
          aria-label={t("products.status")}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | ProductStatus)
          }
          className="px-3 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
        >
          <option value="all">{t("products.filterAll")}</option>
          {PRODUCT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(`products.statuses.${s}`)}
            </option>
          ))}
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
          {t("products.noProducts")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                <th className="py-2 pr-3">{t("products.status")}</th>
                <th className="py-2 pr-3">{t("products.name")}</th>
                <SortHeader
                  label={t("products.printTime")}
                  sortKey="printTime"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="py-2 pr-3">{t("products.weight")}</th>
                <SortHeader
                  label={t("products.cost")}
                  sortKey="cost"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="py-2 pr-3">{t("products.inPersonPrice")}</th>
                <th className="py-2 pr-3">{t("products.onlinePrice")}</th>
                <SortHeader
                  label={t("products.profitInPerson")}
                  sortKey="profitInPerson"
                  sort={sort}
                  onSort={handleSort}
                />
                <SortHeader
                  label={t("products.profitOnline")}
                  sortKey="profitOnline"
                  sort={sort}
                  onSort={handleSort}
                />
                <th className="py-2">
                  <span className="sr-only">{t("common.actions")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => {
                const status = productStatus(p);
                const warn =
                  belowCost(p.salePrice, p.costPrice) ||
                  belowCost(p.inPersonPrice, p.costPrice);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="py-2 pr-3">
                      <select
                        aria-label={`${t("products.status")}: ${p.name}`}
                        value={status}
                        onChange={(e) =>
                          updateProduct(p.id, {
                            status: e.target.value as ProductStatus,
                          })
                        }
                        className={`rounded-full px-2 py-1 text-xs font-medium border-0 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none ${STATUS_BADGE[status]}`}
                      >
                        {PRODUCT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {t(`products.statuses.${s}`)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 font-medium text-[var(--color-text-primary)]">
                      <span className="inline-flex items-center gap-1.5">
                        {p.link ? (
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-[var(--color-accent)] underline-offset-2 hover:underline"
                          >
                            {p.name}
                            <ExternalLink
                              className="w-3 h-3"
                              aria-hidden="true"
                            />
                          </a>
                        ) : (
                          p.name
                        )}
                        {warn && (
                          <span
                            title={t("products.belowCostWarn")}
                            className="text-amber-400"
                            aria-label={t("products.belowCostWarn")}
                          >
                            <AlertTriangle
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-secondary)]">
                      {p.printTimeHours ? `${p.printTimeHours} h` : "—"}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-secondary)]">
                      {/* Same 1-decimal display as the calculator's Part Weight. */}
                      {p.weightGrams ? formatWeight(p.weightGrams) : "—"}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-secondary)]">
                      {format(p.costPrice)}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-secondary)]">
                      {money(p.inPersonPrice)}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-secondary)]">
                      {money(p.salePrice)}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-secondary)]">
                      {perHour(
                        profitPerHour(
                          p.inPersonPrice,
                          p.costPrice,
                          p.printTimeHours,
                        ),
                      )}
                    </td>
                    <td className="py-2 pr-3 text-[var(--color-text-secondary)]">
                      {perHour(
                        profitPerHour(
                          p.salePrice,
                          p.costPrice,
                          p.printTimeHours,
                        ),
                      )}
                    </td>
                    <td className="py-2 flex gap-1">
                      <button
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                        aria-label={`${t("common.edit")}: ${p.name}`}
                        className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(p.id)}
                        aria-label={`${t("common.delete")}: ${p.name}`}
                        className="p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:text-red-400 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <ProductFormModal
          key={editing?.id ?? "new"}
          product={editing}
          onClose={() => {
            setEditing(null);
            setFormOpen(false);
          }}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={confirmDeleteId !== null}
        message={t("products.deleteConfirm")}
        confirmLabel={t("common.confirm")}
        onConfirm={() => {
          if (confirmDeleteId) removeProduct(confirmDeleteId);
          setConfirmDeleteId(null);
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
