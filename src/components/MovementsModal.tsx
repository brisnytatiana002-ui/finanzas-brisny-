import {useEffect, useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {ChevronRight, Plus, Search, X} from 'lucide-react';
import {
  BudgetMovement,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  formatCOP,
  formatPercent,
  sortExpensesNewestFirst,
} from '../data/budgetData';
import {CATEGORY_VISUALS, CategoryIcon} from './CategoryIcon';

interface MovementsModalProps {
  monthLabel: string;
  monthlyBudget: number;
  currentDay: number;
  isCurrentMonth: boolean;
  expenses: BudgetMovement[];
  onClose: () => void;
  onSelectExpense: (expense: BudgetMovement) => void;
  onOpenRegisterExpense: () => void;
  onOpenRegisterIncome: () => void;
}

export function MovementsModal({
  monthLabel,
  monthlyBudget,
  currentDay,
  isCurrentMonth,
  expenses,
  onClose,
  onSelectExpense,
  onOpenRegisterExpense,
  onOpenRegisterIncome,
}: MovementsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Gastos' | 'Ingresos'>(
    'Todos',
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const chronologicalMovements = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sortExpensesNewestFirst(expenses).filter((item) => {
      const matchesType =
        typeFilter === 'Todos' ||
        (typeFilter === 'Ingresos' && item.type === 'income') ||
        (typeFilter === 'Gastos' && item.type === 'expense');
      const matchesCat =
        selectedCategory === 'Todas' || item.category === selectedCategory;
      const matchesQuery =
        !query ||
        item.category.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.dateLabel.toLowerCase().includes(query);
      return matchesType && matchesCat && matchesQuery;
    });
  }, [expenses, searchQuery, typeFilter, selectedCategory]);

  const {totalIncomes, totalExpenses} = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const item of chronologicalMovements) {
      if (item.type === 'income') inc += item.amount;
      else exp += item.amount;
    }
    return {totalIncomes: inc, totalExpenses: exp};
  }, [chronologicalMovements]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="historial-modal-titulo"
      onClick={onClose}
    >
      <motion.div
        initial={{opacity: 0, scale: 0.97, y: 8}}
        animate={{opacity: 1, scale: 1, y: 0}}
        exit={{opacity: 0, scale: 0.97, y: 8}}
        transition={{duration: 0.2, ease: [0.16, 1, 0.3, 1]}}
        className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131720] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del modal de Historial */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div>
            <h2
              id="historial-modal-titulo"
              className="font-display text-xl font-bold tracking-tight text-white"
            >
              Historial de movimientos · {monthLabel}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Gastos e ingresos del mes · Toca cualquier movimiento para ver su detalle
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenRegisterIncome}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5B3DF5] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#6D52F7] whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              <span>Nuevo ingreso</span>
            </button>

            <button
              type="button"
              onClick={onOpenRegisterExpense}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2EE87A] px-3.5 py-2 text-xs font-bold text-[#061A10] transition-colors hover:bg-[#49F28E] whitespace-nowrap shrink-0"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
              <span>Nuevo gasto</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar historial"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1B202C] text-slate-300 transition-colors hover:border-white/20 hover:text-white"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Controles de búsqueda y filtros */}
        <div className="border-b border-white/[0.06] bg-[#0F131C] px-5 py-3.5 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar movimiento o fecha..."
                aria-label="Buscar en el historial"
                className="w-full rounded-full border border-white/[0.08] bg-[#131720] py-2 pl-9 pr-3.5 text-xs text-white placeholder:text-slate-500 focus:border-[#5B3DF5] focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span>
                <strong className="font-mono font-semibold text-white tabular-nums">
                  {chronologicalMovements.length}
                </strong>{' '}
                mov.
              </span>
              {totalIncomes > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>
                    Ingresos:{' '}
                    <strong className="font-mono font-semibold text-[#2EE87A] tabular-nums">
                      +{formatCOP(totalIncomes)}
                    </strong>
                  </span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span>
                Gastos:{' '}
                <strong className="font-mono font-semibold text-white tabular-nums">
                  {formatCOP(totalExpenses)}
                </strong>
              </span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {(['Todos', 'Gastos', 'Ingresos'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTypeFilter(t);
                  setSelectedCategory('Todas');
                }}
                className={`whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? 'bg-[#5B3DF5] text-white'
                    : 'bg-[#1B202C] text-slate-400 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}

            {typeFilter !== 'Ingresos' && (
              <>
                <span className="mx-1 text-slate-700" aria-hidden="true">
                  |
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCategory('Todas')}
                  className={`whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    selectedCategory === 'Todas'
                      ? 'bg-[#2EE87A] text-[#061A10]'
                      : 'bg-[#1B202C] text-slate-400 hover:text-white'
                  }`}
                >
                  Todas
                </button>
                {EXPENSE_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                      selectedCategory === category
                        ? 'bg-[#2EE87A] text-[#061A10]'
                        : 'bg-[#1B202C] text-slate-400 hover:text-white'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Lista desplazable del historial */}
        <div className="flex-1 overflow-y-auto px-5 py-3 sm:px-6">
          {expenses.length === 0 ? (
            <div className="my-10 flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#0B0F17] px-6 py-12 text-center">
              <h3 className="font-display text-xl font-bold text-white">
                Tus gastos van a vivir aquí
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                cada vez que pagues algo, lo registras y aparece en esta lista
              </p>
              <button
                type="button"
                onClick={onOpenRegisterExpense}
                className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(91,61,245,0.28)] transition-all hover:bg-[#6D52F7] active:scale-[0.98]"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                <span>Registrar gasto</span>
              </button>
            </div>
          ) : chronologicalMovements.length === 0 ? (
            <div className="my-8 rounded-xl border border-white/[0.06] bg-[#0B0F17] px-4 py-10 text-center">
              <p className="text-sm text-slate-300">
                No se encontraron movimientos con los filtros aplicados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('Todos');
                  setSelectedCategory('Todas');
                }}
                className="mt-3 rounded-lg bg-[#5B3DF5] px-4 py-2 text-xs font-semibold text-white"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[540px] text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-xs font-medium text-slate-400">
                  <th className="py-2.5 pr-4 font-medium">Categoría</th>
                  <th className="py-2.5 px-4 font-medium">Descripción</th>
                  <th className="py-2.5 px-4 font-medium">Fecha</th>
                  <th className="py-2.5 px-4 font-medium">Impacto</th>
                  <th className="py-2.5 pl-4 text-right font-medium">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05] text-sm">
                {chronologicalMovements.map((movement) => {
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
          )}
        </div>
      </motion.div>
    </div>
  );
}
