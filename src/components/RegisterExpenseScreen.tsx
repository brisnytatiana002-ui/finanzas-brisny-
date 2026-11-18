import {FormEvent, useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {AlertCircle, ArrowLeft, Check, Clock} from 'lucide-react';
import {
  BudgetMovement,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  formatCOP,
  MonthlyBudgetData,
} from '../data/budgetData';
import {CATEGORY_VISUALS} from './CategoryIcon';

interface RegisterExpenseScreenProps {
  month: MonthlyBudgetData;
  currentAvailableBalance: number;
  onCancel: () => void;
  onSaveExpense: (expense: Omit<BudgetMovement, 'id' | 'createdAt'>) => void;
}

const QUICK_AMOUNTS = [10000, 20000, 35000, 50000, 100000];

const QUICK_DESCRIPTIONS: Record<ExpenseCategory, string[]> = {
  Alimentación: ['Almuerzo del día', 'Café y panadería', 'Mercado semanal'],
  Transporte: ['Pasajes transporte público', 'Recarga tarjeta', 'Carrera urbana'],
  'Servicios públicos': ['Factura de energía', 'Internet hogar', 'Servicio de agua'],
  'Ropa y compras personales': ['Artículos personales', 'Prenda de vestir', 'Farmacia'],
  'Entretenimiento y ocio': ['Boletas de cine', 'Salida a café', 'Plan de fin de semana'],
};

export function RegisterExpenseScreen({
  month,
  currentAvailableBalance,
  onCancel,
  onSaveExpense,
}: RegisterExpenseScreenProps) {
  const defaultDay = month.isCurrentMonth ? month.currentDay : month.totalDays;

  const [amountInput, setAmountInput] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Alimentación');
  const [description, setDescription] = useState<string>('');
  const [day, setDay] = useState<number>(defaultDay);
  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    day?: string;
  }>({});

  const parsedAmount = useMemo(() => {
    const cleaned = amountInput.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }, [amountInput]);

  const projectedBalance = currentAvailableBalance - parsedAmount;

  const handleAmountChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^\d]/g, '');
    setAmountInput(digitsOnly);
    if (errors.amount) {
      setErrors((prev) => ({...prev, amount: undefined}));
    }
  };

  const handleQuickAmount = (preset: number) => {
    setAmountInput(String(preset));
    if (errors.amount) {
      setErrors((prev) => ({...prev, amount: undefined}));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nextErrors: {amount?: string; description?: string; day?: string} = {};

    if (!parsedAmount || parsedAmount <= 0) {
      nextErrors.amount = 'Ingresa un monto válido mayor a $0 COP.';
    } else if (parsedAmount > 50000000) {
      nextErrors.amount =
        'El monto ingresado supera el límite permitido para un gasto diario.';
    }

    const trimmedDesc = description.trim();
    if (trimmedDesc.length < 3) {
      nextErrors.description =
        'Escribe una breve descripción (mínimo 3 caracteres).';
    }

    const maxAllowedDay = month.isCurrentMonth ? month.currentDay : month.totalDays;
    if (!Number.isInteger(day) || day < 1 || day > maxAllowedDay) {
      nextErrors.day = `Selecciona un día válido entre 1 y ${maxAllowedDay} de ${month.label.toLowerCase()}.`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month.monthNumber).padStart(2, '0');

    onSaveExpense({
      type: 'expense',
      day,
      dateISO: `${month.year}-${monthStr}-${dayStr}`,
      dateLabel: `${day} ${month.monthAbbr} ${month.year}`,
      category,
      description: trimmedDesc,
      amount: parsedAmount,
    });
  };

  const maxSelectableDay = month.isCurrentMonth ? month.currentDay : month.totalDays;

  return (
    <motion.div
      initial={{opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -8}}
      transition={{duration: 0.22, ease: [0.16, 1, 0.3, 1]}}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* Cabecera */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#131720] text-slate-300 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
            aria-label="Volver al Dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Registrar nuevo gasto
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-slate-400">
              <Clock className="h-3.5 w-3.5 text-[#2EE87A]" aria-hidden="true" />
              <span>Registro rápido para {month.label}</span>
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-6 rounded-2xl border border-white/[0.06] bg-[#131720] p-5 sm:p-7"
      >
        {/* Paso 1: Monto en COP */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label
              htmlFor="expense-amount"
              className="text-sm font-semibold text-white"
            >
              1. ¿Cuánto pagaste? (COP)
            </label>
            {parsedAmount > 0 && (
              <span className="font-mono text-xs font-semibold text-[#2EE87A] tabular-nums">
                {formatCOP(parsedAmount)}
              </span>
            )}
          </div>

          <div className="relative mt-2.5">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xl font-bold text-slate-400">
              $
            </span>
            <input
              id="expense-amount"
              type="text"
              inputMode="numeric"
              autoFocus
              value={
                parsedAmount > 0
                  ? parsedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                  : ''
              }
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              aria-invalid={Boolean(errors.amount)}
              className={`w-full rounded-xl border bg-[#0B0F17] py-3.5 pl-10 pr-16 font-mono text-2xl font-bold text-white tabular-nums placeholder:text-slate-600 focus:outline-none ${
                errors.amount
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-white/[0.08] focus:border-[#2EE87A]'
              }`}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-slate-400">
              COP
            </span>
          </div>

          {/* Atajos de montos rápidos en pesos colombianos */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {QUICK_AMOUNTS.map((preset) => {
              const isActive = parsedAmount === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleQuickAmount(preset)}
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-medium tabular-nums transition-colors ${
                    isActive
                      ? 'border-[#2EE87A] bg-[#2EE87A]/15 text-[#2EE87A]'
                      : 'border-white/[0.08] bg-[#1B202C] text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {formatCOP(preset).replace(' COP', '')}
                </button>
              );
            })}
          </div>

          {errors.amount && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-400" role="alert">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{errors.amount}</span>
            </p>
          )}
        </div>

        {/* Paso 2: Categoría de 1 toque */}
        <div>
          <span className="block text-sm font-semibold text-white">
            2. Categoría
          </span>
          <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {EXPENSE_CATEGORIES.map((item) => {
              const visual = CATEGORY_VISUALS[item];
              const Icon = visual.icon;
              const isSelected = category === item;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A] ${
                    isSelected
                      ? 'border-[#2EE87A] bg-[#162720] text-white'
                      : 'border-white/[0.08] bg-[#0B0F17] text-slate-300 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${visual.iconBg}`}
                      aria-hidden="true"
                    >
                      {Icon && (
                        <Icon className={`h-4 w-4 ${visual.iconColor}`} strokeWidth={2} />
                      )}
                    </span>
                    <span className="truncate text-xs font-medium sm:text-sm">
                      {item}
                    </span>
                  </span>
                  {isSelected && (
                    <Check className="h-4 w-4 shrink-0 text-[#2EE87A]" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Paso 3: Descripción y fecha */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label
              htmlFor="expense-description"
              className="block text-sm font-semibold text-white"
            >
              3. Descripción breve
            </label>
            <input
              id="expense-description"
              type="text"
              maxLength={80}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) {
                  setErrors((prev) => ({...prev, description: undefined}));
                }
              }}
              placeholder="Ej. Almuerzo del día, pasaje, mercado..."
              aria-invalid={Boolean(errors.description)}
              className={`mt-2 w-full rounded-xl border bg-[#0B0F17] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none ${
                errors.description
                  ? 'border-rose-500/80 focus:border-rose-400'
                  : 'border-white/[0.08] focus:border-[#2EE87A]'
              }`}
            />

            {/* Sugerencias rápidas según la categoría */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_DESCRIPTIONS[category].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setDescription(suggestion);
                    if (errors.description) {
                      setErrors((prev) => ({...prev, description: undefined}));
                    }
                  }}
                  className="rounded-md bg-[#1B202C] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {errors.description && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-400" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.description}</span>
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="expense-day"
              className="block text-sm font-semibold text-white"
            >
              Día del mes
            </label>
            <select
              id="expense-day"
              value={day}
              onChange={(e) => {
                setDay(Number(e.target.value));
                if (errors.day) {
                  setErrors((prev) => ({...prev, day: undefined}));
                }
              }}
              className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] px-3.5 py-2.5 font-mono text-sm text-white focus:border-[#2EE87A] focus:outline-none"
            >
              {Array.from({length: maxSelectableDay}, (_, idx) => maxSelectableDay - idx).map(
                (d) => (
                  <option key={d} value={d}>
                    {d} {month.monthAbbr} {month.year}
                    {month.isCurrentMonth && d === month.currentDay ? ' (Hoy)' : ''}
                  </option>
                ),
              )}
            </select>
            {errors.day && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-400" role="alert">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{errors.day}</span>
              </p>
            )}
          </div>
        </div>

        {/* Vista previa en vivo del saldo resultante */}
        <div className="rounded-xl border border-white/[0.06] bg-[#0B0F17] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">Saldo disponible actual:</span>
            <span className="font-mono font-medium text-slate-300 tabular-nums">
              {formatCOP(currentAvailableBalance)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-medium text-white">
              Saldo después de guardar:
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                projectedBalance >= 0 ? 'text-[#2EE87A]' : 'text-rose-400'
              }`}
            >
              {formatCOP(projectedBalance)}
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-full border border-white/[0.1] bg-transparent px-5 py-2.5 text-sm font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white whitespace-nowrap shrink-0"
          >
            Volver
          </button>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#2EE87A] px-6 py-2.5 text-sm font-bold text-[#061A10] shadow-[0_8px_24px_rgba(46,232,122,0.28)] transition-all hover:bg-[#49F28E] active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
            <span>Guardar gasto</span>
          </button>
        </div>
      </form>
    </motion.div>
  );
}
