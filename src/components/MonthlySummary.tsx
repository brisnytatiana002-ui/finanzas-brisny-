import {FormEvent, useEffect, useState} from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Check,
  Pencil,
  Wallet,
  X,
} from 'lucide-react';
import {formatCOP, formatPercent} from '../data/budgetData';

interface MonthlySummaryProps {
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

export function MonthlySummary({
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
}: MonthlySummaryProps) {
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(baseBudget));
  const [budgetError, setBudgetError] = useState<string | null>(null);

  useEffect(() => {
    setBudgetInput(String(baseBudget));
    setIsEditingBudget(false);
    setBudgetError(null);
  }, [baseBudget, monthLabel]);

  const spentPercentage =
    effectiveBudget > 0 ? (totalSpent / effectiveBudget) * 100 : 0;
  const isNegativeBalance = availableBalance < 0;
  const availablePercentage = Math.max(0, 100 - spentPercentage);

  const handleOpenEdit = () => {
    setBudgetInput(String(baseBudget));
    setBudgetError(null);
    setIsEditingBudget(true);
  };

  const handleSaveBudget = (e: FormEvent) => {
    e.preventDefault();
    const cleaned = budgetInput.replace(/[^\d]/g, '');
    const parsed = cleaned ? parseInt(cleaned, 10) : 0;

    if (!parsed || parsed <= 0) {
      setBudgetError('Ingresa un monto mayor a $0 COP.');
      return;
    }
    if (parsed > 500000000) {
      setBudgetError('Monto máximo: $500.000.000 COP.');
      return;
    }

    onUpdateBudget(parsed);
    setIsEditingBudget(false);
    setBudgetError(null);
  };

  const formattedInput = (() => {
    const cleaned = budgetInput.replace(/[^\d]/g, '');
    if (!cleaned) return '';
    return parseInt(cleaned, 10)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  })();

  return (
    <section
      id="resumen"
      aria-labelledby="dashboard-titulo"
      className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between"
    >
      {/* Título principal */}
      <div className="min-w-0 shrink-0">
        <h1
          id="dashboard-titulo"
          className="font-display text-2xl font-bold tracking-tight text-white sm:text-[30px]"
        >
          Mi Presupuesto Mensual
        </h1>
        <p className="mt-1 text-xs text-slate-400 sm:text-sm">
          {isCurrentMonth
            ? `Resumen de ${monthLabel} · Día ${currentDay} de ${totalDays}`
            : `Cierre de ${monthLabel} · ${totalDays} días registrados`}
        </p>
      </div>

      {/* 3 KPIs horizontales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:gap-6">
        {/* KPI 1: Presupuesto disponible (Base editable + Ingresos) */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-400/25 bg-[#12261E] text-[#2EE87A]"
            aria-hidden="true"
          >
            <Wallet className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            {isEditingBudget ? (
              <form onSubmit={handleSaveBudget} className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                      $
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoFocus
                      value={formattedInput}
                      onChange={(e) => {
                        setBudgetInput(e.target.value.replace(/[^\d]/g, ''));
                        if (budgetError) setBudgetError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setIsEditingBudget(false);
                          setBudgetError(null);
                        }
                      }}
                      aria-label="Editar presupuesto base mensual en COP"
                      className="w-36 rounded-lg border border-[#2EE87A] bg-[#0B0F17] py-1 pl-5 pr-2 font-mono text-sm font-bold text-white tabular-nums focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    aria-label="Guardar presupuesto"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2EE87A] text-[#061A10] transition-colors hover:bg-[#49F28E]"
                  >
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingBudget(false);
                      setBudgetError(null);
                    }}
                    aria-label="Cancelar edición"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#1B202C] text-slate-300 transition-colors hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {budgetError && (
                  <p className="text-[11px] text-rose-400">{budgetError}</p>
                )}
              </form>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="group inline-flex items-center gap-1.5 rounded-lg text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
                  title="Haz clic para editar el presupuesto base mensual"
                >
                  <span className="font-mono text-sm font-bold tracking-tight text-white tabular-nums whitespace-nowrap group-hover:text-[#2EE87A] sm:text-base">
                    {formatCOP(effectiveBudget)}
                  </span>
                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06] text-slate-400 transition-colors group-hover:bg-[#2EE87A]/15 group-hover:text-[#2EE87A]">
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                  </span>
                </button>
              </div>
            )}
            <p className="mt-0.5 text-xs text-slate-400 whitespace-nowrap">
              {totalIncome > 0
                ? `Presupuesto (+${formatCOP(totalIncome).replace(' COP', '')} ing.)`
                : 'Presupuesto mensual (editable)'}
            </p>
          </div>
        </div>

        {/* KPI 2: Total gastado */}
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-indigo-400/25 bg-[#161E34] text-[#6E7BF7]"
            aria-hidden="true"
          >
            <Calendar className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-sm font-bold tracking-tight text-white tabular-nums whitespace-nowrap sm:text-base">
                {formatCOP(totalSpent)}
              </span>
              <span
                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap ${
                  isNegativeBalance
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-indigo-500/15 text-[#8994FF]'
                }`}
              >
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                {formatPercent(spentPercentage)}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400 whitespace-nowrap">
              Total gastado
            </p>
          </div>
        </div>

        {/* KPI 3: Disponible para gastar + Estado de cuenta */}
        <div className="flex items-start gap-3">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
              isNegativeBalance
                ? 'border-rose-400/35 bg-rose-500/15 text-rose-400'
                : 'border-emerald-400/25 bg-[#12261E] text-[#2EE87A]'
            }`}
            aria-hidden="true"
          >
            {isNegativeBalance ? (
              <AlertTriangle className="h-4 w-4" strokeWidth={2} />
            ) : (
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-mono text-sm font-bold tracking-tight tabular-nums whitespace-nowrap sm:text-base ${
                  isNegativeBalance ? 'text-rose-400' : 'text-white'
                }`}
              >
                {formatCOP(availableBalance)}
              </span>
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold whitespace-nowrap ${
                  isNegativeBalance
                    ? 'bg-rose-500/20 text-rose-300'
                    : 'bg-emerald-500/15 text-[#2EE87A]'
                }`}
              >
                {isNegativeBalance ? 'Excedido' : formatPercent(availablePercentage)}
              </span>
            </div>
            <p
              className={`mt-0.5 text-xs font-medium whitespace-nowrap ${
                isNegativeBalance ? 'text-rose-400' : 'text-[#2EE87A]'
              }`}
            >
              {isNegativeBalance ? 'Balance negativo' : 'Balance positivo'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
