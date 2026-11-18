import {FormEvent, useMemo, useState} from 'react';
import {motion} from 'motion/react';
import {
  AlertCircle,
  ArrowRight,
  LogOut,
  Sparkles,
  User,
  Wallet,
} from 'lucide-react';
import {formatCOP} from '../data/budgetData';

interface BudgetOnboardingScreenProps {
  initialName: string;
  email: string;
  onComplete: (params: {displayName: string; monthlyBudget: number}) => Promise<void>;
  onSignOut: () => Promise<void>;
}

const BUDGET_PRESETS = [1500000, 2500000, 3500000, 5000000];

export function BudgetOnboardingScreen({
  initialName,
  email,
  onComplete,
  onSignOut,
}: BudgetOnboardingScreenProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [budgetInput, setBudgetInput] = useState('2500000');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const parsedBudget = useMemo(() => {
    const digits = budgetInput.replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }, [budgetInput]);

  const formattedInput = useMemo(() => {
    if (parsedBudget <= 0) return '';
    return parsedBudget.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }, [parsedBudget]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setError(null);

    const trimmedName = displayName.trim();
    if (trimmedName.length < 2) {
      setError('Ingresa un nombre válido (mínimo 2 caracteres).');
      return;
    }

    if (!parsedBudget || parsedBudget <= 0) {
      setError('Define un presupuesto mensual mayor a $0 COP para comenzar.');
      return;
    }

    setIsSaving(true);
    try {
      await onComplete({
        displayName: trimmedName,
        monthlyBudget: parsedBudget,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar tu presupuesto inicial.',
      );
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center bg-[#0A0D14] px-4 py-10 text-slate-100">
      <motion.div
        initial={{opacity: 0, y: 14}}
        animate={{opacity: 1, y: 0}}
        transition={{duration: 0.28, ease: [0.16, 1, 0.3, 1]}}
        className="mx-auto w-full max-w-lg"
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2EE87A] text-[#071A10] shadow-[0_0_20px_rgba(46,232,122,0.28)]"
              aria-hidden="true"
            >
              <Wallet className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <span className="font-display text-base font-bold text-white">
                Mi Presupuesto Mensual
              </span>
              <p className="text-xs text-slate-400">{email}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-[#131720] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/25 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Salir</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#131720] shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
          <div
            className="h-1 w-full bg-gradient-to-r from-[#2EE87A] via-[#5B3DF5] to-[#7B61FF]"
            aria-hidden="true"
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-6 p-6 sm:p-8">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#2EE87A]/30 bg-[#2EE87A]/10 px-3 py-1 text-[11px] font-semibold text-[#2EE87A]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Primera vez en tu cuenta</span>
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white">
                ¿Cuál es tu presupuesto mensual?
              </h1>
              <p className="mt-1.5 text-sm text-slate-400">
                Tu cuenta empieza completamente desde cero. Define el monto base que quieres controlar cada mes en pesos colombianos (COP).
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-200"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label
                htmlFor="onboarding-name"
                className="block text-xs font-semibold text-slate-300"
              >
                ¿Cómo quieres que te llame la app?
              </label>
              <div className="relative mt-1.5">
                <User
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="onboarding-name"
                  type="text"
                  maxLength={60}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-[#5B3DF5] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-2">
                <label
                  htmlFor="onboarding-budget"
                  className="text-sm font-semibold text-white"
                >
                  Presupuesto mensual base (COP)
                </label>
                {parsedBudget > 0 && (
                  <span className="font-mono text-xs font-semibold text-[#2EE87A] tabular-nums">
                    {formatCOP(parsedBudget)}
                  </span>
                )}
              </div>

              <div className="relative mt-2">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 font-mono text-xl font-bold text-slate-400">
                  $
                </span>
                <input
                  id="onboarding-budget"
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={formattedInput}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, '');
                    setBudgetInput(digits);
                    setError(null);
                  }}
                  placeholder="2.500.000"
                  className="w-full rounded-xl border border-white/[0.08] bg-[#0B0F17] py-3.5 pl-10 pr-16 font-mono text-2xl font-bold text-white tabular-nums placeholder:text-slate-600 focus:border-[#2EE87A] focus:outline-none"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-slate-400">
                  COP
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {BUDGET_PRESETS.map((preset) => {
                  const isActive = parsedBudget === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBudgetInput(String(preset));
                        setError(null);
                      }}
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
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2EE87A] py-3.5 text-sm font-bold text-[#061A10] shadow-[0_8px_24px_rgba(46,232,122,0.28)] transition-all hover:bg-[#49F28E] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>
                {isSaving
                  ? 'Creando tu espacio...'
                  : 'Comenzar con mi presupuesto'}
              </span>
              <ArrowRight className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
