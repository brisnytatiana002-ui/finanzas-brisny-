import {ArrowRight, ChevronRight} from 'lucide-react';
import {
  BudgetMovement,
  ExpenseCategory,
  formatCOP,
  formatPercent,
  sortExpensesNewestFirst,
} from '../data/budgetData';
import {CATEGORY_VISUALS, CategoryIcon} from './CategoryIcon';

interface RecentExpensesProps {
  expenses: BudgetMovement[];
  monthlyBudget: number;
  currentDay: number;
  isCurrentMonth: boolean;
  searchQuery: string;
  onSelectExpense: (expense: BudgetMovement) => void;
  onViewAllMovements: () => void;
}

export function RecentExpenses({
  expenses,
  monthlyBudget,
  currentDay,
  isCurrentMonth,
  searchQuery,
  onSelectExpense,
  onViewAllMovements,
}: RecentExpensesProps) {
  const recentFive = sortExpensesNewestFirst(expenses)
    .filter((item) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return (
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.dateLabel.toLowerCase().includes(query) ||
        (item.type === 'income' ? 'ingreso' : 'gasto').includes(query)
      );
    })
    .slice(0, 5);

  return (
    <section
      id="movimientos"
      aria-labelledby="ultimos-movimientos-titulo"
      className="rounded-2xl border border-white/[0.06] bg-[#131720] p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="ultimos-movimientos-titulo"
            className="font-display text-lg font-semibold tracking-tight text-white"
          >
            Últimos movimientos
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            5 movimientos más recientes · Toca un movimiento para ver su detalle
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAllMovements}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#1B202C] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-[#2EE87A]/40 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
        >
          <span>Ver todo ({expenses.length})</span>
          <ArrowRight className="h-3.5 w-3.5 text-[#2EE87A]" aria-hidden="true" />
        </button>
      </div>

      {recentFive.length === 0 ? (
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#0E121B] px-4 py-8 text-center">
          <p className="text-sm text-slate-300">
            No hay movimientos que coincidan con "{searchQuery}".
          </p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[540px] text-left">
            <thead>
              <tr className="border-b border-white/[0.06] text-xs font-medium text-slate-400">
                <th className="pb-3 pr-4 font-medium">Categoría</th>
                <th className="pb-3 px-4 font-medium">Descripción</th>
                <th className="pb-3 px-4 font-medium">Fecha</th>
                <th className="pb-3 px-4 font-medium">Impacto</th>
                <th className="pb-3 pl-4 text-right font-medium">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05] text-sm">
              {recentFive.map((movement) => {
                const isIncome = movement.type === 'income';
                const isToday = isCurrentMonth && movement.day === currentDay;
                const budgetShare =
                  monthlyBudget > 0
                    ? (movement.amount / monthlyBudget) * 100
                    : 0;
                const visual = isIncome
                  ? null
                  : CATEGORY_VISUALS[movement.category as ExpenseCategory] ??
                    CATEGORY_VISUALS['Alimentación'];

                return (
                  <tr
                    key={movement.id}
                    onClick={() => onSelectExpense(movement)}
                    className="group cursor-pointer transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <CategoryIcon
                          category={movement.category}
                          type={movement.type}
                        />
                        <div>
                          <span
                            className={`font-medium whitespace-nowrap ${
                              isIncome ? 'text-[#2EE87A]' : 'text-white'
                            }`}
                          >
                            {movement.category}
                          </span>
                          {isIncome && (
                            <p className="text-[11px] text-emerald-300/80">
                              {isToday ? 'Hoy • Ingreso' : `${movement.dateLabel} • Ingreso`}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="line-clamp-1">{movement.description}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400 tabular-nums whitespace-nowrap">
                      {isToday ? 'Hoy' : movement.dateLabel}
                    </td>
                    <td className="py-3.5 px-4">
                      {isIncome ? (
                        <span className="inline-flex items-center rounded-md bg-emerald-500/15 px-2.5 py-1 font-mono text-xs font-medium text-[#2EE87A] tabular-nums">
                          +{formatPercent(budgetShare)}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center rounded-md px-2.5 py-1 font-mono text-xs font-medium tabular-nums ${visual?.badgeText}`}
                        >
                          {formatPercent(budgetShare)}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <span
                          className={`font-mono text-sm font-semibold tabular-nums whitespace-nowrap ${
                            isIncome ? 'text-[#2EE87A]' : 'text-white'
                          }`}
                        >
                          {isIncome ? '+' : ''}
                          {formatCOP(movement.amount)}
                        </span>
                        <ChevronRight
                          className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-0.5 group-hover:text-[#2EE87A]"
                          aria-hidden="true"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
