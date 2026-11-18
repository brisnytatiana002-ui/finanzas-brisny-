import {motion} from 'motion/react';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Hash,
  Landmark,
  MessageSquare,
  Pencil,
  PieChart,
  Tag,
} from 'lucide-react';
import {BudgetMovement, formatCOP, formatPercent} from '../data/budgetData';
import {CategoryIcon} from './CategoryIcon';

interface ExpenseDetailScreenProps {
  expense: BudgetMovement | null;
  monthLabel: string;
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  backLabel: string;
  onBack: () => void;
}

export function ExpenseDetailScreen({
  expense,
  monthLabel,
  monthlyBudget,
  totalSpent,
  availableBalance,
  backLabel,
  onBack,
}: ExpenseDetailScreenProps) {
  if (!expense) {
    return (
      <motion.div
        initial={{opacity: 0, y: 12}}
        animate={{opacity: 1, y: 0}}
        exit={{opacity: 0, y: -8}}
        transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
        className="mx-auto max-w-3xl space-y-6"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#131720] text-slate-300 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <h1 className="font-display text-2xl font-bold tracking-tight text-white">
            Detalle
          </h1>
        </div>

        <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-white/[0.06] bg-[#131720] px-6 py-12 text-center">
          <p className="text-sm text-slate-400">
            Selecciona un gasto en Movimientos para ver el detalle
          </p>
        </div>
      </motion.div>
    );
  }

  const isIncome = expense.type === 'income';
  const budgetShare =
    monthlyBudget > 0 ? (expense.amount / monthlyBudget) * 100 : 0;
  const spentShare = totalSpent > 0 ? (expense.amount / totalSpent) * 100 : 0;

  return (
    <motion.div
      initial={{opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -8}}
      transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
      className="mx-auto max-w-3xl space-y-6"
    >
      {/* Cabecera */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#131720] text-slate-300 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              {isIncome ? 'Detalle del ingreso' : 'Detalle del gasto'}
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Información completa del movimiento registrado en {monthLabel}
            </p>
          </div>
        </div>

        {/* Botones Volver y Editar (Editar sin funcionalidad por requerimiento) */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-[#131720] px-4 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-white/25 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Volver</span>
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Función de edición disponible próximamente"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-white/[0.08] bg-[#1B202C] px-4 py-2 text-xs font-semibold text-slate-400 opacity-65 whitespace-nowrap shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Editar</span>
          </button>
        </div>
      </header>

      {/* Tarjeta principal del monto y categoría */}
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#131720]">
        <div
          className={`relative overflow-hidden border-b border-white/[0.06] p-6 sm:p-8 ${
            isIncome
              ? 'bg-gradient-to-br from-[#152820] via-[#131E22] to-[#131720]'
              : 'bg-gradient-to-br from-[#182722] via-[#131D1F] to-[#131720]'
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <CategoryIcon category={expense.category} type={expense.type} />
              <div>
                <p className="text-xs font-medium text-slate-400">
                  {isIncome ? 'Ingreso · Categoría' : 'Gasto · Categoría'}
                </p>
                <p className="text-base font-semibold text-white">
                  {expense.category}
                </p>
              </div>
            </div>

            <div className="sm:text-right">
              <p className="text-xs font-medium text-slate-400">
                {isIncome ? 'Valor recibido' : 'Monto pagado'}
              </p>
              <p className="mt-0.5 font-mono text-3xl font-bold tracking-tight text-[#2EE87A] tabular-nums sm:text-4xl">
                {isIncome ? '+' : ''}
                {formatCOP(expense.amount)}
              </p>
            </div>
          </div>
        </div>

        {/* Todos los datos del movimiento */}
        <dl className="divide-y divide-white/[0.06] px-6 sm:px-8">
          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2.5 text-sm text-slate-400">
              <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Descripción</span>
            </dt>
            <dd className="text-sm font-medium text-white sm:text-right">
              {expense.description}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2.5 text-sm text-slate-400">
              <Calendar className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Fecha de registro</span>
            </dt>
            <dd className="font-mono text-sm font-medium text-white tabular-nums sm:text-right">
              {expense.dateLabel} (Día {expense.day} de {monthLabel})
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2.5 text-sm text-slate-400">
              <Tag className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Categoría asignada</span>
            </dt>
            <dd className="text-sm font-medium text-white sm:text-right">
              {expense.category}
            </dd>
          </div>

          {expense.paymentMethod && (
            <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
              <dt className="flex items-center gap-2.5 text-sm text-slate-400">
                <Landmark className="h-4 w-4 text-slate-500" aria-hidden="true" />
                <span>Medio de pago</span>
              </dt>
              <dd className="text-sm font-medium text-white sm:text-right">
                {expense.paymentMethod}
              </dd>
            </div>
          )}

          {expense.notes && (
            <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-start sm:justify-between">
              <dt className="flex items-center gap-2.5 text-sm text-slate-400">
                <MessageSquare
                  className="h-4 w-4 text-slate-500"
                  aria-hidden="true"
                />
                <span>Observaciones</span>
              </dt>
              <dd className="max-w-md text-sm text-slate-200 sm:text-right">
                {expense.notes}
              </dd>
            </div>
          )}

          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2.5 text-sm text-slate-400">
              <PieChart className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>
                {isIncome
                  ? 'Aporte al presupuesto disponible'
                  : 'Impacto en el presupuesto mensual'}
              </span>
            </dt>
            <dd className="font-mono text-sm font-medium text-white tabular-nums sm:text-right">
              {isIncome
                ? `+${formatPercent(budgetShare)} del presupuesto total`
                : `${formatPercent(budgetShare)} del presupuesto (${formatPercent(spentShare)} de lo gastado)`}
            </dd>
          </div>

          <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
            <dt className="flex items-center gap-2.5 text-sm text-slate-400">
              <Hash className="h-4 w-4 text-slate-500" aria-hidden="true" />
              <span>Referencia de sesión</span>
            </dt>
            <dd className="font-mono text-xs text-slate-400 sm:text-right">
              {expense.id} · Moneda COP
            </dd>
          </div>
        </dl>

        {/* Contexto de saldo restante del mes */}
        <div className="border-t border-white/[0.06] bg-[#0E121B] px-6 py-4 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">
              Saldo disponible actual en {monthLabel}:
            </span>
            <span
              className={`font-mono text-sm font-semibold tabular-nums ${
                availableBalance < 0 ? 'text-rose-400' : 'text-[#2EE87A]'
              }`}
            >
              {formatCOP(availableBalance)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
