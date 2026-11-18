import {FormEvent, useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {AlertCircle, ArrowLeft, CheckCircle2, Sparkles} from 'lucide-react';
import {
  BudgetMovement,
  formatCOP,
  formatDateLabelFromISO,
  INCOME_CATEGORIES,
  IncomeCategory,
  MonthlyBudgetData,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../data/budgetData';

interface RegisterIncomeScreenProps {
  month: MonthlyBudgetData;
  currentAvailableBalance: number;
  onCancel: () => void;
  onSaveIncome: (income: Omit<BudgetMovement, 'id' | 'createdAt'>) => void;
}

const DESCRIPTION_EXAMPLES = [
  'Salario',
  'Freelance',
  'Venta de computador',
  'Bonificación',
  'Reembolso',
];

export function RegisterIncomeScreen({
  month,
  currentAvailableBalance,
  onCancel,
  onSaveIncome,
}: RegisterIncomeScreenProps) {
  const defaultDateISO = useMemo(() => {
    const dayStr = String(month.isCurrentMonth ? month.currentDay : month.totalDays).padStart(
      2,
      '0',
    );
    const monthStr = String(month.monthNumber).padStart(2, '0');
    return `${month.year}-${monthStr}-${dayStr}`;
  }, [month]);

  const [amountInput, setAmountInput] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<IncomeCategory>('Salario');
  const [dateISO, setDateISO] = useState<string>(defaultDateISO);
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>('Cuenta bancaria');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const [errors, setErrors] = useState<{
    amount?: string;
    description?: string;
    category?: string;
    dateISO?: string;
    paymentMethod?: string;
  }>({});

  const parsedAmount = useMemo(() => {
    const cleaned = amountInput.replace(/[^\d]/g, '');
    return cleaned ? parseInt(cleaned, 10) : 0;
  }, [amountInput]);

  const formattedInput = useMemo(() => {
    if (parsedAmount <= 0) return '';
    return parsedAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }, [parsedAmount]);

  const projectedBalance = currentAvailableBalance + parsedAmount;

  const handleAmountChange = (raw: string) => {
    if (raw.includes('-')) {
      setErrors((prev) => ({
        ...prev,
        amount: 'No se permiten valores negativos.',
      }));
      return;
    }
    const digitsOnly = raw.replace(/[^\d]/g, '');
    setAmountInput(digitsOnly);
    if (errors.amount) {
      setErrors((prev) => ({...prev, amount: undefined}));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const nextErrors: {
      amount?: string;
      description?: string;
      category?: string;
      dateISO?: string;
      paymentMethod?: string;
    } = {};

    if (!amountInput.trim() || parsedAmount === 0) {
      nextErrors.amount =
        'Por favor ingresa un valor de ingreso mayor a $0 COP.';
    } else if (parsedAmount < 0) {
      nextErrors.amount = 'El valor del ingreso no puede ser negativo.';
    } else if (parsedAmount > 500000000) {
      nextErrors.amount = 'El monto ingresado excede el límite permitido.';
    }

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      nextErrors.description =
        'Por favor escribe una descripción para identificar el ingreso.';
    }

    if (!category) {
      nextErrors.category = 'Selecciona una categoría válida.';
    }

    if (!dateISO) {
      nextErrors.dateISO = 'Selecciona la fecha en que recibiste el ingreso.';
    }

    if (!paymentMethod) {
      nextErrors.paymentMethod = 'Selecciona un medio de pago.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const {day, dateLabel} = formatDateLabelFromISO(dateISO);

    setIsSaving(true);
    window.setTimeout(() => {
      onSaveIncome({
        type: 'income',
        day,
        dateISO,
        dateLabel,
        category,
        description: trimmedDesc,
        amount: parsedAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
    }, 850);
  };

  return (
    <motion.div
      initial={{opacity: 0, y: 12}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -8}}
      transition={{duration: 0.24, ease: [0.16, 1, 0.3, 1]}}
      className="mx-auto max-w-2xl space-y-6"
    >
      {/* Cabecera */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-[#131720] text-slate-300 transition-all hover:border-[#5B3DF5]/60 hover:text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
            aria-label="Volver al Dashboard"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Registrar Nuevo Ingreso
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Registra cualquier ingreso recibido para aumentar el presupuesto disponible de {month.label}
            </p>
          </div>
        </div>
      </header>

      {/* Tarjeta principal del formulario */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#131720] shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
        {/* Acento superior sutil morado */}
        <div
          className="h-1 w-full bg-gradient-to-r from-[#5B3DF5] via-[#7B61FF] to-[#2EE87A]"
          aria-hidden="true"
        />

        {isSaving ? (
          <motion.div
            initial={{opacity: 0, scale: 0.96}}
            animate={{opacity: 1, scale: 1}}
            transition={{duration: 0.25}}
            className="flex flex-col items-center justify-center px-6 py-16 text-center"
            role="status"
            aria-live="polite"
          >
            <motion.div
              initial={{scale: 0.6, opacity: 0}}
              animate={{scale: 1, opacity: 1}}
              transition={{type: 'spring', stiffness: 260, damping: 18}}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-500/20 text-[#2EE87A] shadow-[0_0_32px_rgba(46,232,122,0.3)]"
            >
              <CheckCircle2 className="h-8 w-8" strokeWidth={2.2} />
            </motion.div>
            <p className="mt-5 font-display text-xl font-bold text-white">
              ✅ Ingreso registrado correctamente.
            </p>
            <p className="mt-2 font-mono text-sm font-semibold text-[#2EE87A] tabular-nums">
              +{formatCOP(parsedAmount)}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Actualizando presupuesto disponible y regresando al Dashboard...
            </p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5 sm:p-7">
            {/* 💰 Valor del ingreso (obligatorio) */}
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="income-amount"
                  className="text-sm font-semibold text-white"
                >
                  💰 Valor del ingreso <span className="text-[#8E77FF]">*</span>
                </label>
                {parsedAmount > 0 && (
                  <span className="font-mono text-xs font-semibold text-[#2EE87A] tabular-nums">
                    +{formatCOP(parsedAmount)}
                  </span>
                )}
              </div>

              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xl font-bold text-slate-400">
                  $
                </span>
                <input
                  id="income-amount"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={formattedInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder="850.000"
                  aria-invalid={Boolean(errors.amount)}
                  className={`w-full rounded-xl border bg-[#0B0F17] py-3.5 pl-10 pr-16 font-mono text-2xl font-bold text-white tabular-nums placeholder:text-slate-600 transition-colors focus:outline-none ${
                    errors.amount
                      ? 'border-rose-500/80 focus:border-rose-400'
                      : 'border-white/[0.08] focus:border-[#5B3DF5]'
                  }`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-slate-400">
                  COP
                </span>
              </div>

              {errors.amount && (
                <p
                  className="mt-2 flex items-center gap-1.5 text-xs text-rose-400"
                  role="alert"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.amount}</span>
                </p>
              )}
            </div>

            {/* 📝 Descripción */}
            <div>
              <label
                htmlFor="income-description"
                className="block text-sm font-semibold text-white"
              >
                📝 Descripción <span className="text-[#8E77FF]">*</span>
              </label>
              <input
                id="income-description"
                type="text"
                maxLength={90}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) {
                    setErrors((prev) => ({...prev, description: undefined}));
                  }
                }}
                placeholder="Ej. Salario, Freelance, Venta de computador, Bonificación, Reembolso..."
                aria-invalid={Boolean(errors.description)}
                className={`mt-2 w-full rounded-xl border bg-[#0B0F17] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none ${
                  errors.description
                    ? 'border-rose-500/80 focus:border-rose-400'
                    : 'border-white/[0.08] focus:border-[#5B3DF5]'
                }`}
              />

              {/* Ejemplos clicables */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {DESCRIPTION_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setDescription(example);
                      if (errors.description) {
                        setErrors((prev) => ({...prev, description: undefined}));
                      }
                    }}
                    className="rounded-lg bg-[#1B202C] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-[#5B3DF5]/25 hover:text-white"
                  >
                    {example}
                  </button>
                ))}
              </div>

              {errors.description && (
                <p
                  className="mt-2 flex items-center gap-1.5 text-xs text-rose-400"
                  role="alert"
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{errors.description}</span>
                </p>
              )}
            </div>

            {/* 📂 Categoría y 📅 Fecha del ingreso */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="income-category"
                  className="block text-sm font-semibold text-white"
                >
                  📂 Categoría <span className="text-[#8E77FF]">*</span>
                </label>
                <select
                  id="income-category"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value as IncomeCategory);
                    if (errors.category) {
                      setErrors((prev) => ({...prev, category: undefined}));
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] px-3.5 py-2.5 text-sm text-white transition-colors focus:border-[#5B3DF5] focus:outline-none"
                >
                  {INCOME_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1.5 text-xs text-rose-400" role="alert">
                    {errors.category}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="income-date"
                  className="block text-sm font-semibold text-white"
                >
                  📅 Fecha del ingreso <span className="text-[#8E77FF]">*</span>
                </label>
                <input
                  id="income-date"
                  type="date"
                  value={dateISO}
                  onChange={(e) => {
                    setDateISO(e.target.value);
                    if (errors.dateISO) {
                      setErrors((prev) => ({...prev, dateISO: undefined}));
                    }
                  }}
                  className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] px-3.5 py-2.5 font-mono text-sm text-white transition-colors focus:border-[#5B3DF5] focus:outline-none [color-scheme:dark]"
                />
                {errors.dateISO && (
                  <p className="mt-1.5 text-xs text-rose-400" role="alert">
                    {errors.dateISO}
                  </p>
                )}
              </div>
            </div>

            {/* 🏦 Medio de pago */}
            <div>
              <label
                htmlFor="income-payment-method"
                className="block text-sm font-semibold text-white"
              >
                🏦 Medio de pago <span className="text-[#8E77FF]">*</span>
              </label>
              <select
                id="income-payment-method"
                value={paymentMethod}
                onChange={(e) => {
                  setPaymentMethod(e.target.value as PaymentMethod);
                  if (errors.paymentMethod) {
                    setErrors((prev) => ({...prev, paymentMethod: undefined}));
                  }
                }}
                className="mt-2 w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] px-3.5 py-2.5 text-sm text-white transition-colors focus:border-[#5B3DF5] focus:outline-none"
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
              {errors.paymentMethod && (
                <p className="mt-1.5 text-xs text-rose-400" role="alert">
                  {errors.paymentMethod}
                </p>
              )}
            </div>

            {/* 📝 Observaciones (opcional) */}
            <div>
              <label
                htmlFor="income-notes"
                className="block text-sm font-semibold text-white"
              >
                📝 Observaciones{' '}
                <span className="text-xs font-normal text-slate-400">
                  (opcional)
                </span>
              </label>
              <textarea
                id="income-notes"
                rows={3}
                maxLength={250}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Agrega detalles adicionales o notas sobre este ingreso..."
                className="mt-2 w-full resize-none rounded-xl border border-white/[0.08] bg-[#0B0F17] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-[#5B3DF5] focus:outline-none"
              />
            </div>

            {/* Vista previa del nuevo saldo disponible */}
            <div className="rounded-xl border border-[#5B3DF5]/25 bg-[#17152B] p-4">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-300">Saldo disponible actual:</span>
                <span className="font-mono font-medium text-slate-200 tabular-nums">
                  {formatCOP(currentAvailableBalance)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium text-white">
                  <Sparkles
                    className="h-3.5 w-3.5 text-[#8E77FF]"
                    aria-hidden="true"
                  />
                  <span>Nuevo saldo disponible:</span>
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

            {/* Botones Guardar ingreso (morado #5B3DF5) y Cancelar (gris) */}
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center justify-center rounded-full bg-[#242B3A] px-5 py-2.5 text-sm font-semibold text-slate-200 transition-all duration-150 hover:bg-[#313A4E] hover:text-white active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 py-2.5 text-sm font-bold text-white shadow-[0_8px_24px_rgba(91,61,245,0.35)] transition-all duration-150 hover:bg-[#6D52F7] hover:shadow-[0_10px_28px_rgba(91,61,245,0.48)] active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
              >
                <span>Guardar ingreso</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </motion.div>
  );
}
