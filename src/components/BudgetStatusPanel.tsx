import {AlertTriangle, CheckCircle2, Pencil} from 'lucide-react';
import {FormEvent, useEffect, useState} from 'react';
import {formatCOP, formatPercent} from '../data/budgetData';

interface BudgetStatusPanelProps {
  monthLabel: string;
  baseBudget: number;
  totalIncome: number;
  effectiveBudget: number;
  totalSpent: number;
  availableBalance: number;
  currentDay: number;
  totalDays: number;
  isCurrentMonth: boolean;
  onUpdateBudget: (newBudget: number) => void;
}

export function BudgetStatusPanel({
  monthLabel,
  baseBudget,
  totalIncome,
  effectiveBudget,
  totalSpent,
  availableBalance,
  currentDay,
  totalDays,
  isCurrentMonth,
  onUpdateBudget,
}: BudgetStatusPanelProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(baseBudget));

  useEffect(() => {
    setInputVal(String(baseBudget));
    setEditing(false);
  }, [baseBudget, monthLabel]);

  const rawSpentPercentage =
    effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0;
  const barWidthPercent = Math.min(100, Math.max(0, rawSpentPercentage));
  const isNegative = availableBalance < 0;
  const availablePercentage = Math.max(0, 100 - rawSpentPercentage);
  const remainingDays = Math.max(0, totalDays - currentDay);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = inputVal.replace(/[^\d]/g, '');
    const parsed = cleaned ? parseInt(cleaned, 10) : 0;
    if (parsed > 0 && parsed <= 500000000) {
      onUpdateBudget(parsed);
      setEditing(false);
    }
  };

  const formattedVal = (() => {
    const cleaned = inputVal.replace(/[^\d]/g, '');
    if (!cleaned) return '';
    return parseInt(cleaned, 10)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  })();

  return (
    <section
      aria-labelledby="estado-presupuesto-titulo"
      className="flex w-full flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#131720] p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2
          id="estado-presupuesto-titulo"
          className="font-display text-lg font-semibold tracking-tight text-white"
        >
          Estado de cuenta
        </h2>
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            isNegative ? 'text-rose-400' : 'text-[#2EE87A]'
          }`}
        >
          {isNegative ? (
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{isNegative ? 'Balance negativo' : 'Balance positivo'}</span>
        </span>
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {/* Bloque 1: Disponible para gastar */}
        <div
          className={`relative overflow-hidden rounded-2xl p-5 transition-colors ${
            isNegative
              ? 'bg-gradient-to-br from-[#991B1B] via-[#DC2626] to-[#F43F5E] text-white shadow-[0_12px_28px_rgba(244,63,94,0.22)]'
              : 'bg-gradient-to-br from-[#0DA66A] via-[#22D67B] to-[#56F996] text-[#061A10] shadow-[0_12px_28px_rgba(34,214,123,0.16)]'
          }`}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15 blur-xl"
            aria-hidden="true"
          />

          <div className="relative flex items-center justify-between gap-2">
            <span
              className={`text-xs font-semibold tracking-tight ${
                isNegative ? 'text-white/90' : 'text-[#072617]/80'
              }`}
            >
              Disponible para gastar
            </span>
            <span
              className={`font-mono text-xs font-bold tabular-nums ${
                isNegative ? 'text-white' : 'text-[#061A10]'
              }`}
            >
              {isNegative ? 'Balance negativo' : 'Balance positivo'}
            </span>
          </div>

          <p
            className={`relative mt-2.5 font-mono text-2xl font-bold tracking-tight tabular-nums sm:text-[26px] ${
              isNegative ? 'text-white' : 'text-[#05180E]'
            }`}
          >
            {formatCOP(availableBalance)}
          </p>

          <div
            className={`relative mt-4 flex items-center justify-between gap-2 text-xs font-medium ${
              isNegative ? 'text-white/90' : 'text-[#072617]/85'
            }`}
          >
            <span>
              {isNegative
                ? `Sobregiro de ${formatCOP(Math.abs(availableBalance))}`
                : isCurrentMonth
                ? `${remainingDays} días restantes`
                : `Cierre de ${monthLabel.toLowerCase()}`}
            </span>
            <span className="font-mono text-[11px] tabular-nums">
              {totalIncome > 0
                ? 'Base + Ingresos − Gastos'
                : 'Presupuesto − Gastos'}
            </span>
          </div>
        </div>

        {/* Bloque 2: Presupuesto total disponible + Porcentaje gastado */}
        <div
          className={`relative overflow-hidden rounded-2xl p-5 text-white ${
            isNegative
              ? 'border border-rose-500/30 bg-[#1B151D]'
              : 'bg-gradient-to-br from-[#4F56EC] via-[#676FF8] to-[#8C96FF] shadow-[0_12px_28px_rgba(95,104,244,0.18)]'
          }`}
        >
          <div className="relative flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-white/85">
              Presupuesto total
            </span>
            {!editing && (
              <button
                type="button"
                onClick={() => {
                  setInputVal(String(baseBudget));
                  setEditing(true);
                }}
                className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white transition-colors hover:bg-white/25"
              >
                <Pencil className="h-3 w-3" aria-hidden="true" />
                <span>Editar base</span>
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleSave} className="relative mt-2 flex items-center gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-xs text-white/70">
                  $
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={formattedVal}
                  onChange={(e) =>
                    setInputVal(e.target.value.replace(/[^\d]/g, ''))
                  }
                  aria-label="Nuevo presupuesto base en COP"
                  className="w-full rounded-lg border border-white/30 bg-black/25 py-1.5 pl-6 pr-2 font-mono text-sm font-bold text-white tabular-nums focus:border-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-slate-900 hover:bg-slate-100"
              >
                OK
              </button>
            </form>
          ) : (
            <div className="relative mt-2 flex items-baseline justify-between gap-2">
              <p className="font-mono text-xl font-bold tracking-tight text-white tabular-nums">
                {formatCOP(effectiveBudget)}
              </p>
              <span className="font-mono text-xs font-semibold text-white/90 tabular-nums">
                {formatPercent(rawSpentPercentage)} gastado
              </span>
            </div>
          )}

          {totalIncome > 0 && !editing && (
            <p className="relative mt-1 font-mono text-[11px] text-white/80 tabular-nums">
              Base: {formatCOP(baseBudget)} · Ingresos: +{formatCOP(totalIncome)}
            </p>
          )}

          {/* Barra visual de progreso */}
          <div className="relative mt-3.5">
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-black/25 p-0.5"
              role="progressbar"
              aria-valuenow={Math.round(barWidthPercent)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Porcentaje gastado: ${formatPercent(rawSpentPercentage)}`}
            >
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isNegative ? 'bg-rose-400' : 'bg-white'
                }`}
                style={{width: `${barWidthPercent}%`}}
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-white/90 tabular-nums">
              <span>Gastado: {formatPercent(rawSpentPercentage)}</span>
              <span>
                {isNegative
                  ? 'Disponible: 0,0%'
                  : `Disponible: ${formatPercent(availablePercentage)}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
