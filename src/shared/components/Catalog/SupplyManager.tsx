import { useState } from "react";
import { useTranslation } from "react-i18next";
import { InputGroup } from "@/shared/components/ui/InputGroup";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { useCatalogStore } from "@/shared/stores/catalogStore";

type SupplyKind = "extraParts" | "packagings";

interface SupplyItem {
  id: string;
  name: string;
  cost: number;
}

/**
 * Buma Labs fork: registers extra parts ("Corrente" = R$ 0,60) and
 * packaging sizes (P, M, G, GG) that the calculator picks from.
 */
export function SupplyManager({ kind }: { kind: SupplyKind }) {
  const { t } = useTranslation();
  const { symbol: currencySymbol, format } = useCurrency();
  const store = useCatalogStore();
  const items: SupplyItem[] =
    kind === "extraParts" ? store.extraParts : store.packagings;
  const add = kind === "extraParts" ? store.addExtraPart : store.addPackaging;
  const update =
    kind === "extraParts" ? store.updateExtraPart : store.updatePackaging;
  const remove =
    kind === "extraParts" ? store.removeExtraPart : store.removePackaging;

  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCost, setEditCost] = useState("");

  const parseCost = (value: string) =>
    Math.max(0, Number(value.replace(",", ".")) || 0);

  const handleAdd = () => {
    if (!name.trim()) return;
    add({ name: name.trim(), cost: parseCost(cost) });
    setName("");
    setCost("");
  };

  const startEdit = (item: SupplyItem) => {
    setEditingId(item.id);
    setEditName(item.name);
    setEditCost(String(item.cost));
  };

  const saveEdit = () => {
    if (!editingId || !editName.trim()) return;
    update(editingId, { name: editName.trim(), cost: parseCost(editCost) });
    setEditingId(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <div className="surface rounded-xl p-5 space-y-3">
        <div className="text-sm font-semibold text-[var(--color-text-primary)]">
          {t(`supplies.${kind}.add`)}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">
          {t(`supplies.${kind}.hint`)}
        </p>
        <InputGroup
          label={t("supplies.name")}
          value={name}
          onChange={setName}
          placeholder={t(`supplies.${kind}.namePlaceholder`)}
        />
        <InputGroup
          label={t("supplies.cost")}
          value={cost}
          onChange={setCost}
          type="number"
          prefix={currencySymbol}
        />
        <button
          onClick={handleAdd}
          className="w-full py-3 rounded-xl bg-[var(--accent-fill)] text-white font-semibold hover:bg-[var(--accent-fill-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
        >
          {t("catalog.save")}
        </button>
      </div>
      <div className="grid gap-3 content-start md:grid-cols-2 2xl:grid-cols-3">
        {items.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {t(`supplies.${kind}.empty`)}
          </p>
        )}
        {items.map((item) =>
          editingId === item.id ? (
            <div key={item.id} className="surface rounded-xl p-4 space-y-3">
              <InputGroup
                label={t("supplies.name")}
                value={editName}
                onChange={setEditName}
              />
              <InputGroup
                label={t("supplies.cost")}
                value={editCost}
                onChange={setEditCost}
                type="number"
                prefix={currencySymbol}
              />
              <div className="flex gap-3 text-xs">
                <button
                  onClick={saveEdit}
                  className="font-semibold text-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none rounded"
                >
                  {t("catalog.saveChanges")}
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-[var(--color-text-secondary)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none rounded"
                >
                  {t("catalog.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div key={item.id} className="surface rounded-xl p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="font-semibold text-[var(--color-text-primary)]">
                  {item.name}
                </div>
                <div className="font-mono text-sm text-[var(--color-text-secondary)]">
                  {format(item.cost)}
                </div>
              </div>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => startEdit(item)}
                  aria-label={t("supplies.editItem", { name: item.name })}
                  className="text-[var(--color-accent)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none rounded"
                >
                  {t("supplies.edit")}
                </button>
                <button
                  onClick={() => remove(item.id)}
                  aria-label={t("supplies.removeItem", { name: item.name })}
                  className="text-[var(--color-danger)] hover:text-red-300 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none rounded"
                >
                  {t("catalog.remove")}
                </button>
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}
