import {useEffect, useMemo, useState} from 'react';
import {AnimatePresence, motion} from 'motion/react';
import {
  Bot,
  CheckCircle2,
  Loader2,
  LogOut,
  Plus,
  ReceiptText,
  Search,
  Wallet,
  X,
} from 'lucide-react';
import {onAuthStateChanged, signOut, User} from 'firebase/auth';
import {collection, doc, onSnapshot, query, where} from 'firebase/firestore';
import {
  BudgetMovement,
  EMPTY_MONTH_TEMPLATES,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  formatCOP,
  formatDateLabelFromISO,
  INCOME_CATEGORIES,
  IncomeCategory,
  MonthlyBudgetData,
  PaymentMethod,
} from './data/budgetData';
import {
  auth,
  createMovementInFirestore,
  db,
  handleFirestoreError,
  initializeAccountBudget,
  MonthlyBudgetFirestoreDoc,
  MovementFirestoreDoc,
  OperationType,
  updateMonthBudgetInFirestore,
  updateUserDisplayNameInFirestore,
  UserProfileDoc,
} from './firebase';
import {MonthlySummary} from './components/MonthlySummary';
import {DailyExpensesChart} from './components/DailyExpensesChart';
import {BudgetStatusPanel} from './components/BudgetStatusPanel';
import {RecentExpenses} from './components/RecentExpenses';
import {MovementsModal} from './components/MovementsModal';
import {ExpenseDetailScreen} from './components/ExpenseDetailScreen';
import {RegisterExpenseScreen} from './components/RegisterExpenseScreen';
import {RegisterIncomeScreen} from './components/RegisterIncomeScreen';
import {AssistantDrawer} from './components/AssistantDrawer';
import {AuthScreen} from './components/AuthScreen';
import {BudgetOnboardingScreen} from './components/BudgetOnboardingScreen';

type ActiveView =
  | 'dashboard'
  | 'detalle'
  | 'registrar'
  | 'registrar-ingreso';

function normalizeExpenseCategory(raw: string): ExpenseCategory {
  const normalized = raw.trim().toLowerCase();
  const exact = EXPENSE_CATEGORIES.find(
    (c) => c.toLowerCase() === normalized,
  );
  if (exact) return exact;
  if (normalized.includes('aliment') || normalized.includes('comida')) {
    return 'Alimentación';
  }
  if (normalized.includes('transp')) return 'Transporte';
  if (normalized.includes('servic')) return 'Servicios públicos';
  if (normalized.includes('ropa') || normalized.includes('compra')) {
    return 'Ropa y compras personales';
  }
  if (normalized.includes('entreten') || normalized.includes('ocio')) {
    return 'Entretenimiento y ocio';
  }
  return 'Alimentación';
}

function normalizeMovementCategory(
  type: 'expense' | 'income',
  raw: string,
): ExpenseCategory | IncomeCategory {
  if (type === 'expense') {
    return normalizeExpenseCategory(raw);
  }
  const exact = INCOME_CATEGORIES.find(
    (c) => c.toLowerCase() === raw.trim().toLowerCase(),
  );
  return exact ?? 'Otro';
}

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Estado aislado en Firestore para la cuenta autenticada
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfileDoc | null>(null);
  const [monthDocs, setMonthDocs] = useState<
    Record<string, MonthlyBudgetFirestoreDoc>
  >({});
  const [movementsByMonth, setMovementsByMonth] = useState<
    Record<string, BudgetMovement[]>
  >({});
  const [firestoreError, setFirestoreError] = useState<Error | null>(null);

  const [selectedMonthId, setSelectedMonthId] = useState<string>(
    EMPTY_MONTH_TEMPLATES[0].id,
  );
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [openedDetailFromHistory, setOpenedDetailFromHistory] =
    useState<boolean>(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  if (firestoreError) {
    throw firestoreError;
  }

  // Suscripción a sesión de Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      // Reiniciar estado de la sesión anterior inmediatamente al cambiar de usuario o cerrar sesión
      setProfileLoaded(false);
      setUserProfile(null);
      setMonthDocs({});
      setMovementsByMonth({});
      setFirestoreError(null);
      setSelectedMonthId(EMPTY_MONTH_TEMPLATES[0].id);
      setActiveView('dashboard');
      setIsHistoryModalOpen(false);
      setIsAssistantOpen(false);
      setSelectedExpenseId(null);
      setSearchQuery('');
      setSavedNotice(null);
    });
    return () => unsubscribe();
  }, []);

  // Listeners de Firestore solo cuando auth está listo y hay usuario autenticado
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const uid = currentUser.uid;
    const profilePath = `users/${uid}`;
    const monthsPath = `users/${uid}/months`;
    const movementsPath = `users/${uid}/movements`;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data() as UserProfileDoc);
        } else {
          setUserProfile(null);
        }
        setProfileLoaded(true);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.GET, profilePath);
        } catch (wrapped) {
          setFirestoreError(
            wrapped instanceof Error ? wrapped : new Error(String(wrapped)),
          );
        }
      },
    );

    const monthsQuery = query(
      collection(db, 'users', uid, 'months'),
      where('ownerId', '==', uid),
    );
    const unsubMonths = onSnapshot(
      monthsQuery,
      (snapshot) => {
        const nextMonths: Record<string, MonthlyBudgetFirestoreDoc> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MonthlyBudgetFirestoreDoc;
          nextMonths[data.monthId || docSnap.id] = data;
        });
        setMonthDocs(nextMonths);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, monthsPath);
        } catch (wrapped) {
          setFirestoreError(
            wrapped instanceof Error ? wrapped : new Error(String(wrapped)),
          );
        }
      },
    );

    const movementsQuery = query(
      collection(db, 'users', uid, 'movements'),
      where('ownerId', '==', uid),
    );
    const unsubMovements = onSnapshot(
      movementsQuery,
      (snapshot) => {
        const grouped: Record<string, BudgetMovement[]> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as MovementFirestoreDoc;
          const mId = data.monthId || EMPTY_MONTH_TEMPLATES[0].id;
          if (!grouped[mId]) grouped[mId] = [];
          grouped[mId].push({
            id: docSnap.id,
            type: data.type,
            day: data.day,
            dateISO: data.dateISO,
            dateLabel: data.dateLabel,
            category: normalizeMovementCategory(data.type, data.category),
            description: data.description,
            amount: data.amount,
            paymentMethod: data.paymentMethod as PaymentMethod | undefined,
            notes: data.notes,
            createdAt: data.clientCreatedAt ?? 0,
          });
        });
        setMovementsByMonth(grouped);
      },
      (error) => {
        try {
          handleFirestoreError(error, OperationType.LIST, movementsPath);
        } catch (wrapped) {
          setFirestoreError(
            wrapped instanceof Error ? wrapped : new Error(String(wrapped)),
          );
        }
      },
    );

    return () => {
      unsubProfile();
      unsubMonths();
      unsubMovements();
    };
  }, [authReady, currentUser]);

  // Construcción de presupuestos por mes para el usuario actual (empezando desde cero)
  const budgets: MonthlyBudgetData[] = useMemo(() => {
    const fallbackBudget = userProfile?.defaultMonthlyBudget ?? 0;
    return EMPTY_MONTH_TEMPLATES.map((template) => {
      const savedMonth = monthDocs[template.id];
      return {
        ...template,
        monthlyBudget:
          typeof savedMonth?.monthlyBudget === 'number'
            ? savedMonth.monthlyBudget
            : fallbackBudget,
        expenses: movementsByMonth[template.id] ?? [],
      };
    });
  }, [monthDocs, movementsByMonth, userProfile?.defaultMonthlyBudget]);

  const activeMonth = useMemo(
    () => budgets.find((month) => month.id === selectedMonthId) ?? budgets[0],
    [budgets, selectedMonthId],
  );

  // Reglas de negocio:
  // Presupuesto disponible total = Presupuesto base mensual + Ingresos registrados
  // Saldo disponible = Presupuesto disponible total - Gastos registrados
  const {totalSpent, totalIncome, hasExpenses} = useMemo(() => {
    let spent = 0;
    let income = 0;
    let expenseCount = 0;
    for (const item of activeMonth.expenses) {
      if (item.type === 'income') {
        income += item.amount;
      } else {
        spent += item.amount;
        expenseCount += 1;
      }
    }
    return {
      totalSpent: spent,
      totalIncome: income,
      hasExpenses: expenseCount > 0,
    };
  }, [activeMonth]);

  const effectiveBudget = activeMonth.monthlyBudget + totalIncome;
  const availableBalance = effectiveBudget - totalSpent;

  const currentDateISO = useMemo(() => {
    const dayStr = String(
      activeMonth.isCurrentMonth ? activeMonth.currentDay : activeMonth.totalDays,
    ).padStart(2, '0');
    const monthStr = String(activeMonth.monthNumber).padStart(2, '0');
    return `${activeMonth.year}-${monthStr}-${dayStr}`;
  }, [activeMonth]);

  const userName = useMemo(() => {
    if (userProfile?.displayName?.trim()) return userProfile.displayName.trim();
    if (currentUser?.displayName?.trim()) return currentUser.displayName.trim();
    if (currentUser?.email) return currentUser.email.split('@')[0] || 'Usuario';
    return 'Usuario';
  }, [currentUser, userProfile]);

  const selectedExpense = useMemo(() => {
    if (!selectedExpenseId) return null;
    return (
      activeMonth.expenses.find((item) => item.id === selectedExpenseId) ?? null
    );
  }, [activeMonth, selectedExpenseId]);

  const resolveTargetMonthId = (dateISO: string): string => {
    const prefix = dateISO.slice(0, 7);
    const matching = budgets.find((m) => m.id === prefix);
    return matching ? matching.id : activeMonth.id;
  };

  const handleCompleteOnboarding = async (params: {
    displayName: string;
    monthlyBudget: number;
  }) => {
    if (!currentUser) return;
    await initializeAccountBudget({
      uid: currentUser.uid,
      email: currentUser.email ?? '',
      displayName: params.displayName,
      monthlyBudget: params.monthlyBudget,
      profileExists: userProfile !== null,
    });
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const handleUpdateBudget = async (newBudget: number) => {
    if (!currentUser) return;
    await updateMonthBudgetInFirestore({
      uid: currentUser.uid,
      month: activeMonth,
      newBudget,
    });
  };

  const handleChangeUserName = async (nextName: string) => {
    if (!currentUser) return;
    await updateUserDisplayNameInFirestore({
      uid: currentUser.uid,
      displayName: nextName,
    });
  };

  const handleOpenExpenseDetail = (
    expense: BudgetMovement,
    fromHistory: boolean,
  ) => {
    setSelectedExpenseId(expense.id);
    setOpenedDetailFromHistory(fromHistory);
    setIsHistoryModalOpen(false);
    setActiveView('detalle');
  };

  const handleBackFromDetail = () => {
    setActiveView('dashboard');
    if (openedDetailFromHistory) {
      setIsHistoryModalOpen(true);
    }
  };

  const handleSaveExpense = async (
    newExpense: Omit<BudgetMovement, 'id' | 'createdAt'>,
  ) => {
    if (!currentUser) return;
    const targetMonthId = resolveTargetMonthId(newExpense.dateISO);
    await createMovementInFirestore({
      uid: currentUser.uid,
      monthId: targetMonthId,
      movement: newExpense,
    });

    setSavedNotice(
      `Gasto de ${formatCOP(newExpense.amount)} en ${newExpense.category} guardado en tu cuenta (${activeMonth.label}).`,
    );
    setActiveView('dashboard');
  };

  const handleAssistantRegisterExpense = async (payload: {
    amount: number;
    date: string;
    description: string;
    category: string;
  }) => {
    if (!currentUser) return;
    const {day, dateLabel} = formatDateLabelFromISO(payload.date);
    const category = normalizeExpenseCategory(payload.category);
    const targetMonthId = resolveTargetMonthId(payload.date);

    const newExpense: Omit<BudgetMovement, 'id' | 'createdAt'> = {
      type: 'expense',
      day,
      dateISO: payload.date,
      dateLabel,
      category,
      description: payload.description,
      amount: Math.round(payload.amount),
    };

    await createMovementInFirestore({
      uid: currentUser.uid,
      monthId: targetMonthId,
      movement: newExpense,
    });

    setSavedNotice(
      `¡Listo, ${userName}! Gasto de ${formatCOP(newExpense.amount)} en ${newExpense.category} registrado mediante el asistente.`,
    );
  };

  const handleSaveIncome = async (
    newIncome: Omit<BudgetMovement, 'id' | 'createdAt'>,
  ) => {
    if (!currentUser) return;
    const targetMonthId = resolveTargetMonthId(newIncome.dateISO);
    await createMovementInFirestore({
      uid: currentUser.uid,
      monthId: targetMonthId,
      movement: newIncome,
    });

    setSavedNotice(
      `✅ Ingreso registrado correctamente (+${formatCOP(newIncome.amount)} en ${newIncome.category}).`,
    );
    setActiveView('dashboard');
  };

  const handleSelectMonth = (monthId: string) => {
    setSelectedMonthId(monthId);
    setSelectedExpenseId(null);
    setSavedNotice(null);
    if (activeView === 'detalle') {
      setActiveView('dashboard');
    }
  };

  // 1. Pantalla de carga inicial de autenticación
  if (!authReady) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0A0D14] text-slate-300">
        <Loader2 className="h-7 w-7 animate-spin text-[#5B3DF5]" aria-hidden="true" />
        <p className="text-sm font-medium">Verificando tu sesión...</p>
      </div>
    );
  }

  // 2. Pantalla de inicio de sesión / creación de cuenta
  if (!currentUser) {
    return <AuthScreen />;
  }

  // 3. Esperar lectura inicial del perfil de Firestore
  if (!profileLoaded) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#0A0D14] text-slate-300">
        <Loader2 className="h-7 w-7 animate-spin text-[#2EE87A]" aria-hidden="true" />
        <p className="text-sm font-medium">Cargando los datos de tu cuenta...</p>
      </div>
    );
  }

  // 4. Primera vez que la cuenta entra o se crea: preguntar presupuesto mensual (inicia desde cero)
  if (!userProfile || !userProfile.onboardingCompleted) {
    return (
      <BudgetOnboardingScreen
        initialName={userName}
        email={currentUser.email ?? ''}
        onComplete={handleCompleteOnboarding}
        onSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100">
      {/* Barra superior */}
      <header className="border-b border-white/[0.06] bg-[#0D1119]">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:px-8">
          {/* Marca */}
          <button
            type="button"
            onClick={() => {
              setIsHistoryModalOpen(false);
              setActiveView('dashboard');
            }}
            className="flex items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
          >
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#2EE87A] text-[#071A10] shadow-[0_0_20px_rgba(46,232,122,0.28)]"
              aria-hidden="true"
            >
              <Wallet className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
              Mi Presupuesto Mensual
            </span>
          </button>

          {/* Buscador (en Dashboard) */}
          {activeView === 'dashboard' && (
            <div className="order-3 w-full xl:order-2 xl:max-w-xs">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar categoría o movimiento..."
                  aria-label="Buscar categoría o movimiento"
                  className="w-full rounded-full border border-white/[0.08] bg-[#131720] py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 transition-colors focus:border-[#5B3DF5] focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Selector de mes + Asistente + Cuenta / Salir */}
          <div className="order-2 flex flex-wrap items-center gap-2 xl:order-3">
            <div
              className="inline-flex items-center rounded-full border border-white/[0.08] bg-[#131720] p-1"
              role="tablist"
              aria-label="Seleccionar período mensual"
            >
              {budgets.map((month) => {
                const isActive = month.id === activeMonth.id;
                return (
                  <button
                    key={month.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleSelectMonth(month.id)}
                    className={`whitespace-nowrap shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#1F2736] text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {month.shortLabel}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsAssistantOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-[#5B3DF5]/45 bg-[#17152B] px-3.5 py-2 text-xs font-semibold text-white transition-all hover:border-[#5B3DF5] hover:bg-[#5B3DF5]/20 active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
            >
              <Bot className="h-4 w-4 text-[#8E77FF]" aria-hidden="true" />
              <span>Asistente</span>
            </button>

            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#131720] py-1 pl-3 pr-1.5">
              <span
                title={currentUser.email ?? userName}
                className="max-w-[110px] truncate text-xs font-medium text-slate-200"
              >
                {userName}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="inline-flex items-center gap-1 rounded-full bg-[#1B202C] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors hover:bg-rose-500/20 hover:text-rose-200"
              >
                <LogOut className="h-3 w-3" aria-hidden="true" />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido principal con transiciones suaves */}
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {activeView === 'dashboard' && (
            <motion.div
              key="view-dashboard"
              initial={{opacity: 0, y: 8}}
              animate={{opacity: 1, y: 0}}
              exit={{opacity: 0, y: -8}}
              transition={{duration: 0.2, ease: [0.16, 1, 0.3, 1]}}
              className="space-y-7"
            >
              {savedNotice && (
                <motion.div
                  initial={{opacity: 0, y: -6}}
                  animate={{opacity: 1, y: 0}}
                  role="status"
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/35 bg-[#11251D] px-4 py-3 text-xs font-medium text-emerald-100"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-[#2EE87A]"
                      aria-hidden="true"
                    />
                    <span>{savedNotice}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSavedNotice(null)}
                    className="rounded-md p-1 text-emerald-200/70 transition-colors hover:text-white"
                    aria-label="Cerrar aviso"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </motion.div>
              )}

              {/* Métricas del mes + Presupuesto editable */}
              <MonthlySummary
                monthLabel={activeMonth.label}
                baseBudget={activeMonth.monthlyBudget}
                totalIncome={totalIncome}
                effectiveBudget={effectiveBudget}
                totalSpent={totalSpent}
                availableBalance={availableBalance}
                currentDay={activeMonth.currentDay}
                totalDays={activeMonth.totalDays}
                isCurrentMonth={activeMonth.isCurrentMonth}
                onUpdateBudget={handleUpdateBudget}
              />

              {/* Acciones rápidas centradas debajo de las métricas del mes */}
              <section
                aria-labelledby="acciones-rapidas-titulo"
                className="mx-auto w-full max-w-[600px] rounded-2xl border border-white/[0.06] bg-[#131720] px-5 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.28)] sm:px-6 sm:py-5"
              >
                <h2
                  id="acciones-rapidas-titulo"
                  className="text-center text-xs font-semibold tracking-wide text-slate-400"
                >
                  Acciones rápidas
                </h2>

                <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSavedNotice(null);
                      setIsHistoryModalOpen(false);
                      setActiveView('registrar-ingreso');
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#2EE87A] px-5 text-xs font-bold text-[#061A10] shadow-[0_8px_24px_rgba(46,232,122,0.22)] transition-all duration-150 hover:bg-[#49F28E] hover:shadow-[0_10px_28px_rgba(46,232,122,0.34)] active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A] sm:text-sm"
                  >
                    <Plus
                      className="h-4 w-4 shrink-0"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                    <span>Registrar ingreso</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSavedNotice(null);
                      setIsHistoryModalOpen(false);
                      setActiveView('registrar');
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-5 text-xs font-bold text-white shadow-[0_8px_24px_rgba(91,61,245,0.28)] transition-all duration-150 hover:bg-[#6D52F7] hover:shadow-[0_10px_28px_rgba(91,61,245,0.42)] active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5] sm:text-sm"
                  >
                    <Plus
                      className="h-4 w-4 shrink-0"
                      strokeWidth={2.4}
                      aria-hidden="true"
                    />
                    <span>Registrar gasto</span>
                  </button>
                </div>
              </section>

              {/* Gráfica o Dashboard vacío + Estado de cuenta */}
              <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
                <div className="flex lg:col-span-8">
                  {hasExpenses ? (
                    <DailyExpensesChart
                      key={activeMonth.id}
                      monthId={activeMonth.id}
                      monthLabel={activeMonth.label}
                      monthAbbr={activeMonth.monthAbbr}
                      year={activeMonth.year}
                      totalDays={activeMonth.totalDays}
                      currentDay={activeMonth.currentDay}
                      isCurrentMonth={activeMonth.isCurrentMonth}
                      monthlyBudget={effectiveBudget}
                      totalSpent={totalSpent}
                      expenses={activeMonth.expenses}
                    />
                  ) : (
                    /* Dashboard vacío integrado dentro del Dashboard principal */
                    <section
                      aria-labelledby="dashboard-vacio-titulo"
                      className="flex w-full flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-[#131720] px-6 py-12 text-center sm:px-10"
                    >
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#5B3DF5]/35 bg-[#5B3DF5]/15 text-[#8E77FF]"
                        aria-hidden="true"
                      >
                        <ReceiptText className="h-6 w-6" strokeWidth={1.8} />
                      </div>
                      <h2
                        id="dashboard-vacio-titulo"
                        className="mt-4 font-display text-xl font-bold tracking-tight text-white sm:text-2xl"
                      >
                        Aún no hay gastos este mes
                      </h2>
                      <p className="mt-2 max-w-md text-sm text-slate-400">
                        Registra el primero y empieza a ver en qué se va la plata
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSavedNotice(null);
                          setIsHistoryModalOpen(false);
                          setActiveView('registrar');
                        }}
                        className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-6 text-sm font-bold text-white shadow-[0_8px_24px_rgba(91,61,245,0.28)] transition-all duration-150 hover:bg-[#6D52F7] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5B3DF5]"
                      >
                        <Plus
                          className="h-4 w-4 shrink-0"
                          strokeWidth={2.4}
                          aria-hidden="true"
                        />
                        <span>Registrar tu primer gasto</span>
                      </button>
                    </section>
                  )}
                </div>

                <div className="flex lg:col-span-4">
                  <BudgetStatusPanel
                    monthLabel={activeMonth.label}
                    baseBudget={activeMonth.monthlyBudget}
                    totalIncome={totalIncome}
                    effectiveBudget={effectiveBudget}
                    totalSpent={totalSpent}
                    availableBalance={availableBalance}
                    currentDay={activeMonth.currentDay}
                    totalDays={activeMonth.totalDays}
                    isCurrentMonth={activeMonth.isCurrentMonth}
                    onUpdateBudget={handleUpdateBudget}
                  />
                </div>
              </div>

              {/* Últimos movimientos + Detalle vacío cuando no hay gastos */}
              {hasExpenses || activeMonth.expenses.length > 0 ? (
                <RecentExpenses
                  expenses={activeMonth.expenses}
                  monthlyBudget={effectiveBudget}
                  currentDay={activeMonth.currentDay}
                  isCurrentMonth={activeMonth.isCurrentMonth}
                  searchQuery={searchQuery}
                  onSelectExpense={(expense) =>
                    handleOpenExpenseDetail(expense, false)
                  }
                  onViewAllMovements={() => setIsHistoryModalOpen(true)}
                />
              ) : (
                <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
                  {/* Movimientos vacío dentro del Dashboard */}
                  <section
                    aria-labelledby="movimientos-vacio-titulo"
                    className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#131720] p-5 sm:p-6 lg:col-span-7"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display text-base font-semibold text-white">
                        Movimientos
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsHistoryModalOpen(true)}
                        className="rounded-xl border border-white/[0.08] bg-[#1B202C] px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
                      >
                        Ver todo (0)
                      </button>
                    </div>

                    <div className="my-6 flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-[#0B0F17] px-5 py-8 text-center">
                      <h3
                        id="movimientos-vacio-titulo"
                        className="font-display text-lg font-bold text-white"
                      >
                        Tus gastos van a vivir aquí
                      </h3>
                      <p className="mt-1.5 max-w-sm text-sm text-slate-400">
                        cada vez que pagues algo, lo registras y aparece en esta lista
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSavedNotice(null);
                          setIsHistoryModalOpen(false);
                          setActiveView('registrar');
                        }}
                        className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#5B3DF5] px-5 text-xs font-bold text-white shadow-[0_8px_24px_rgba(91,61,245,0.28)] transition-all hover:bg-[#6D52F7] active:scale-[0.98]"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" />
                        <span>Registrar gasto</span>
                      </button>
                    </div>
                  </section>

                  {/* Detalle vacío sin botón */}
                  <section
                    aria-labelledby="detalle-vacio-titulo"
                    className="flex flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#131720] p-5 sm:p-6 lg:col-span-5"
                  >
                    <h3
                      id="detalle-vacio-titulo"
                      className="font-display text-base font-semibold text-white"
                    >
                      Detalle
                    </h3>
                    <div className="my-6 flex flex-1 items-center justify-center rounded-xl border border-white/[0.05] bg-[#0B0F17] px-5 py-10 text-center">
                      <p className="text-sm text-slate-400">
                        Selecciona un gasto en Movimientos para ver el detalle
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </motion.div>
          )}

          {activeView === 'detalle' && (
            <ExpenseDetailScreen
              key="view-detalle"
              expense={selectedExpense}
              monthLabel={activeMonth.label}
              monthlyBudget={effectiveBudget}
              totalSpent={totalSpent}
              availableBalance={availableBalance}
              backLabel={
                openedDetailFromHistory
                  ? 'Volver al historial'
                  : 'Volver al Dashboard'
              }
              onBack={handleBackFromDetail}
            />
          )}

          {activeView === 'registrar' && (
            <RegisterExpenseScreen
              key="view-registrar-gasto"
              month={activeMonth}
              currentAvailableBalance={availableBalance}
              onCancel={() => setActiveView('dashboard')}
              onSaveExpense={handleSaveExpense}
            />
          )}

          {activeView === 'registrar-ingreso' && (
            <RegisterIncomeScreen
              key="view-registrar-ingreso"
              month={activeMonth}
              currentAvailableBalance={availableBalance}
              onCancel={() => setActiveView('dashboard')}
              onSaveIncome={handleSaveIncome}
            />
          )}
        </AnimatePresence>
      </main>

      {/* Modal de Historial completo al tocar "Ver todo" */}
      <AnimatePresence>
        {isHistoryModalOpen && (
          <MovementsModal
            monthLabel={activeMonth.label}
            monthlyBudget={effectiveBudget}
            currentDay={activeMonth.currentDay}
            isCurrentMonth={activeMonth.isCurrentMonth}
            expenses={activeMonth.expenses}
            onClose={() => setIsHistoryModalOpen(false)}
            onSelectExpense={(expense) => handleOpenExpenseDetail(expense, true)}
            onOpenRegisterExpense={() => {
              setIsHistoryModalOpen(false);
              setActiveView('registrar');
            }}
            onOpenRegisterIncome={() => {
              setIsHistoryModalOpen(false);
              setActiveView('registrar-ingreso');
            }}
          />
        )}
      </AnimatePresence>

      {/* Asistente inteligente conectado al servidor Express + Gemini */}
      <AssistantDrawer
        key={currentUser.uid}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        budgetContext={{
          userName,
          monthLabel: activeMonth.label,
          baseBudget: activeMonth.monthlyBudget,
          totalIncome,
          effectiveBudget,
          totalSpent,
          availableBalance,
          currentDateISO,
        }}
        onChangeUserName={handleChangeUserName}
        onRegisterExpense={handleAssistantRegisterExpense}
      />
    </div>
  );
}
