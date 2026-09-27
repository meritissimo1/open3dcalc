import { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Shield, X } from "lucide-react";

interface PrivacyPolicyProps {
  open: boolean;
  onClose: () => void;
}

export function PrivacyPolicy({ open, onClose }: PrivacyPolicyProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap + ESC close
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("privacy.policy.title")}
    >
      <div
        ref={dialogRef}
        className="surface rounded-xl p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <div className="p-2.5 rounded-full bg-[var(--color-accent-muted)]">
            <Shield className="w-5 h-5 text-[var(--color-accent)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold gradient-text">
              {t("privacy.policy.title")}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-bg-hover)] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:outline-none"
            aria-label={t("common.close")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 text-sm text-[var(--color-text-secondary)] leading-relaxed pr-1">
          <p className="text-xs text-[var(--color-text-muted)]">
            Última atualização: 28 de Junho de 2026
          </p>

          <Section title="1. Modelo de Dados">
            <p>
              O Open3DCalc é uma aplicação 100% client-side. Todos os dados
              inseridos pelo usuário — parâmetros de cálculo, dados de clientes,
              orçamentos, configurações — são armazenados exclusivamente no
              navegador do usuário (localStorage). Nenhum dado é enviado,
              transmitido ou armazenado em servidores externos.
            </p>
          </Section>

          <Section title="2. Base Legal (LGPD)">
            <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018):</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Art. 7º, I: mediante consentimento do titular</li>
              <li>Art. 10º: legítimo interesse do controlador</li>
              <li>Art. 46º: segurança dos dados</li>
            </ul>
          </Section>

          <Section title="3. Direitos do Titular (Art. 18 LGPD)">
            <p>Você pode a qualquer momento:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Acessar seus dados (via interface do app)</li>
              <li>Corrigir dados incompletos ou desatualizados</li>
              <li>
                Excluir seus dados (botão &ldquo;Limpar todos os dados&rdquo;)
              </li>
              <li>Exportar seus dados em formato JSON</li>
            </ul>
          </Section>

          <Section title="4. Transferência Internacional">
            <p>
              Não há transferência internacional de dados, pois nenhum dado sai
              do seu dispositivo.
            </p>
          </Section>

          <Section title="5. Retenção de Dados">
            <p>Os dados permanecem no navegador até que você:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Limpe o cache do navegador</li>
              <li>Clique em &ldquo;Limpar todos os dados&rdquo;</li>
              <li>Desinstale o aplicativo</li>
            </ul>
          </Section>

          <Section title="6. Segurança (Art. 46 LGPD)">
            <p>Recomendamos:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Fazer backup regular dos dados (export JSON)</li>
              <li>Manter o navegador atualizado</li>
              <li>
                Não utilizar em computadores compartilhados sem limpar os dados
                ao final
              </li>
            </ul>
          </Section>

          <Section title="7. Contato">
            <p>
              Desenvolvido por @ils15. Para questões de privacidade, abra uma
              issue em{" "}
              <a
                href="https://github.com/meritissimo1/open3dcalc"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:text-[var(--color-accent-light)] underline underline-offset-2 transition-colors"
              >
                github.com/meritissimo1/open3dcalc
              </a>
            </p>
          </Section>

          <Section title={t("privacy.policy.section8Title")}>
            <p>{t("privacy.policy.section8Intro")}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("privacy.policy.section8Item1")}</li>
              <li>{t("privacy.policy.section8Item2")}</li>
              <li>{t("privacy.policy.section8Item3")}</li>
              <li>{t("privacy.policy.section8Item4")}</li>
            </ul>
            <p>{t("privacy.policy.section8Lgpd")}</p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-semibold text-[var(--color-text-primary)] mb-1.5">
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
