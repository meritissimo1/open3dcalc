import { useTranslation } from "react-i18next";
import { useCalculatorStore } from "@/shared/stores/calculatorStore";
import { useShallow } from "zustand/react/shallow";

const inputClass =
	"w-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-2 min-h-[44px] text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]";

export function ProductName() {
	const { t } = useTranslation();
	const { productName, setProductName, productLink, setProductLink } =
		useCalculatorStore(
			useShallow((s) => ({
				productName: s.productName,
				setProductName: s.setProductName,
				productLink: s.productLink,
				setProductLink: s.setProductLink,
			})),
		);

	return (
		<div className="surface rounded-xl px-5 py-5 grid grid-cols-1 @form:grid-cols-[2fr_1fr] gap-3">
			<input
				type="text"
				value={productName}
				onChange={(e) => setProductName(e.target.value)}
				placeholder={t("calc.productNamePlaceholder")}
				className={inputClass}
			/>
			{/* Buma Labs fork: the link goes with the product to the Products tab. */}
			<input
				type="url"
				value={productLink}
				onChange={(e) => setProductLink(e.target.value)}
				placeholder={t("products.linkPlaceholder")}
				aria-label={t("products.link")}
				className={inputClass}
			/>
		</div>
	);
}
