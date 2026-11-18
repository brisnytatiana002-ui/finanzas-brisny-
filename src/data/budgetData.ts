export type ExpenseCategory =
  | 'Alimentación'
  | 'Transporte'
  | 'Servicios públicos'
  | 'Ropa y compras personales'
  | 'Entretenimiento y ocio';

export type IncomeCategory =
  | 'Salario'
  | 'Trabajo independiente'
  | 'Negocio'
  | 'Inversiones'
  | 'Regalo'
  | 'Bonificación'
  | 'Reembolso'
  | 'Otro';

export type PaymentMethod =
  | 'Efectivo'
  | 'Cuenta bancaria'
  | 'Nequi'
  | 'Daviplata'
  | 'Tarjeta'
  | 'Otro';

export type MovementType = 'expense' | 'income';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Alimentación',
  'Transporte',
  'Servicios públicos',
  'Ropa y compras personales',
  'Entretenimiento y ocio',
];

export const INCOME_CATEGORIES: IncomeCategory[] = [
  'Salario',
  'Trabajo independiente',
  'Negocio',
  'Inversiones',
  'Regalo',
  'Bonificación',
  'Reembolso',
  'Otro',
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  'Efectivo',
  'Cuenta bancaria',
  'Nequi',
  'Daviplata',
  'Tarjeta',
  'Otro',
];

export interface BudgetMovement {
  id: string;
  type: MovementType;
  day: number;
  dateISO: string;
  dateLabel: string;
  category: ExpenseCategory | IncomeCategory;
  description: string;
  amount: number;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: number;
}

export type DailyExpense = BudgetMovement;

export interface MonthlyBudgetData {
  id: string;
  label: string;
  shortLabel: string;
  monthAbbr: string;
  monthNumber: number;
  year: number;
  totalDays: number;
  currentDay: number;
  isCurrentMonth: boolean;
  monthlyBudget: number;
  expenses: BudgetMovement[];
}

export function formatCOP(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded < 0 ? '-' : ''}$${formatted} COP`;
}

export function formatCOPCompact(amount: number): string {
  const rounded = Math.round(amount);
  const formatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${rounded < 0 ? '-' : ''}$${formatted}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`;
}

export function formatDateLabelFromISO(dateISO: string): {
  day: number;
  dateLabel: string;
} {
  const monthsAbbr = [
    'ene',
    'feb',
    'mar',
    'abr',
    'may',
    'jun',
    'jul',
    'ago',
    'sep',
    'oct',
    'nov',
    'dic',
  ];
  const parts = dateISO.split('-').map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    const [year, month, day] = parts;
    const abbr = monthsAbbr[Math.max(0, Math.min(11, month - 1))];
    return {
      day,
      dateLabel: `${day} ${abbr} ${year}`,
    };
  }
  return {day: 17, dateLabel: dateISO};
}

export function sortExpensesNewestFirst(
  movements: BudgetMovement[],
): BudgetMovement[] {
  return [...movements].sort(
    (a, b) =>
      b.dateISO.localeCompare(a.dateISO) ||
      b.day - a.day ||
      b.createdAt - a.createdAt,
  );
}

export const EMPTY_MONTH_TEMPLATES: MonthlyBudgetData[] = [
  {
    id: '2026-11',
    label: 'Noviembre 2026',
    shortLabel: 'Nov 2026',
    monthAbbr: 'nov',
    monthNumber: 11,
    year: 2026,
    totalDays: 30,
    currentDay: 17,
    isCurrentMonth: true,
    monthlyBudget: 0,
    expenses: [],
  },
  {
    id: '2026-10',
    label: 'Octubre 2026',
    shortLabel: 'Oct 2026',
    monthAbbr: 'oct',
    monthNumber: 10,
    year: 2026,
    totalDays: 31,
    currentDay: 31,
    isCurrentMonth: false,
    monthlyBudget: 0,
    expenses: [],
  },
];

export const MONTHLY_BUDGETS: MonthlyBudgetData[] = [
  {
    id: '2026-11',
    label: 'Noviembre 2026',
    shortLabel: 'Nov 2026',
    monthAbbr: 'nov',
    monthNumber: 11,
    year: 2026,
    totalDays: 30,
    currentDay: 17,
    isCurrentMonth: true,
    monthlyBudget: 2500000,
    expenses: [],
  },
  {
    id: '2026-10',
    label: 'Octubre 2026',
    shortLabel: 'Oct 2026',
    monthAbbr: 'oct',
    monthNumber: 10,
    year: 2026,
    totalDays: 31,
    currentDay: 31,
    isCurrentMonth: false,
    monthlyBudget: 2500000,
    expenses: [
      {
        id: 'oct-01',
        type: 'expense',
        day: 1,
        dateISO: '2026-10-01',
        dateLabel: '1 oct 2026',
        category: 'Alimentación',
        description: 'Mercado quincenal de despensa',
        amount: 158000,
        createdAt: 1,
      },
      {
        id: 'oct-02',
        type: 'expense',
        day: 2,
        dateISO: '2026-10-02',
        dateLabel: '2 oct 2026',
        category: 'Transporte',
        description: 'Recarga transporte público',
        amount: 30000,
        createdAt: 2,
      },
      {
        id: 'oct-03',
        type: 'expense',
        day: 3,
        dateISO: '2026-10-03',
        dateLabel: '3 oct 2026',
        category: 'Entretenimiento y ocio',
        description: 'Cena de fin de semana con amigos',
        amount: 85000,
        createdAt: 3,
      },
      {
        id: 'oct-04',
        type: 'expense',
        day: 4,
        dateISO: '2026-10-04',
        dateLabel: '4 oct 2026',
        category: 'Alimentación',
        description: 'Desayuno familiar y frutas',
        amount: 46000,
        createdAt: 4,
      },
      {
        id: 'oct-05',
        type: 'expense',
        day: 5,
        dateISO: '2026-10-05',
        dateLabel: '5 oct 2026',
        category: 'Servicios públicos',
        description: 'Factura mensual de energía eléctrica',
        amount: 144000,
        createdAt: 5,
      },
      {
        id: 'oct-06',
        type: 'expense',
        day: 6,
        dateISO: '2026-10-06',
        dateLabel: '6 oct 2026',
        category: 'Transporte',
        description: 'Pasajes urbanos del día',
        amount: 12000,
        createdAt: 6,
      },
      {
        id: 'oct-07',
        type: 'expense',
        day: 7,
        dateISO: '2026-10-07',
        dateLabel: '7 oct 2026',
        category: 'Alimentación',
        description: 'Almuerzo y panadería',
        amount: 31000,
        createdAt: 7,
      },
      {
        id: 'oct-09',
        type: 'expense',
        day: 9,
        dateISO: '2026-10-09',
        dateLabel: '9 oct 2026',
        category: 'Ropa y compras personales',
        description: 'Tenis deportivos en descuento',
        amount: 175000,
        createdAt: 8,
      },
      {
        id: 'oct-10',
        type: 'expense',
        day: 10,
        dateISO: '2026-10-10',
        dateLabel: '10 oct 2026',
        category: 'Servicios públicos',
        description: 'Acueducto, gas e internet hogar',
        amount: 182000,
        createdAt: 9,
      },
      {
        id: 'oct-11',
        type: 'expense',
        day: 11,
        dateISO: '2026-10-11',
        dateLabel: '11 oct 2026',
        category: 'Alimentación',
        description: 'Mercado semanal de verduras y carne',
        amount: 149000,
        createdAt: 10,
      },
      {
        id: 'oct-12',
        type: 'expense',
        day: 12,
        dateISO: '2026-10-12',
        dateLabel: '12 oct 2026',
        category: 'Entretenimiento y ocio',
        description: 'Entrada a museo y café',
        amount: 48000,
        createdAt: 11,
      },
      {
        id: 'oct-14',
        type: 'expense',
        day: 14,
        dateISO: '2026-10-14',
        dateLabel: '14 oct 2026',
        category: 'Transporte',
        description: 'Recarga transporte y movilidad',
        amount: 35000,
        createdAt: 12,
      },
      {
        id: 'oct-15',
        type: 'expense',
        day: 15,
        dateISO: '2026-10-15',
        dateLabel: '15 oct 2026',
        category: 'Alimentación',
        description: 'Almuerzo ejecutivo',
        amount: 27000,
        createdAt: 13,
      },
      {
        id: 'oct-17',
        type: 'expense',
        day: 17,
        dateISO: '2026-10-17',
        dateLabel: '17 oct 2026',
        category: 'Ropa y compras personales',
        description: 'Productos de farmacia y cuidado personal',
        amount: 68000,
        createdAt: 14,
      },
      {
        id: 'oct-18',
        type: 'expense',
        day: 18,
        dateISO: '2026-10-18',
        dateLabel: '18 oct 2026',
        category: 'Alimentación',
        description: 'Mercado de fin de semana',
        amount: 136000,
        createdAt: 15,
      },
      {
        id: 'oct-20',
        type: 'expense',
        day: 20,
        dateISO: '2026-10-20',
        dateLabel: '20 oct 2026',
        category: 'Transporte',
        description: 'Trayectos laborales de la semana',
        amount: 24000,
        createdAt: 16,
      },
      {
        id: 'oct-22',
        type: 'expense',
        day: 22,
        dateISO: '2026-10-22',
        dateLabel: '22 oct 2026',
        category: 'Alimentación',
        description: 'Almuerzo y café especial',
        amount: 34000,
        createdAt: 17,
      },
      {
        id: 'oct-24',
        type: 'expense',
        day: 24,
        dateISO: '2026-10-24',
        dateLabel: '24 oct 2026',
        category: 'Entretenimiento y ocio',
        description: 'Obra de teatro local',
        amount: 110000,
        createdAt: 18,
      },
      {
        id: 'oct-25',
        type: 'expense',
        day: 25,
        dateISO: '2026-10-25',
        dateLabel: '25 oct 2026',
        category: 'Alimentación',
        description: 'Mercado de cierre de mes',
        amount: 154000,
        createdAt: 19,
      },
      {
        id: 'oct-27',
        type: 'expense',
        day: 27,
        dateISO: '2026-10-27',
        dateLabel: '27 oct 2026',
        category: 'Transporte',
        description: 'Recarga tarjeta de transporte',
        amount: 26000,
        createdAt: 20,
      },
      {
        id: 'oct-28',
        type: 'expense',
        day: 28,
        dateISO: '2026-10-28',
        dateLabel: '28 oct 2026',
        category: 'Ropa y compras personales',
        description: 'Chaqueta ligera impermeable',
        amount: 165000,
        createdAt: 21,
      },
      {
        id: 'oct-29',
        type: 'expense',
        day: 29,
        dateISO: '2026-10-29',
        dateLabel: '29 oct 2026',
        category: 'Alimentación',
        description: 'Almuerzo y refrigerios',
        amount: 41000,
        createdAt: 22,
      },
      {
        id: 'oct-30',
        type: 'expense',
        day: 30,
        dateISO: '2026-10-30',
        dateLabel: '30 oct 2026',
        category: 'Entretenimiento y ocio',
        description: 'Concierto acústico y café',
        amount: 55000,
        createdAt: 23,
      },
      {
        id: 'oct-31',
        type: 'expense',
        day: 31,
        dateISO: '2026-10-31',
        dateLabel: '31 oct 2026',
        category: 'Alimentación',
        description: 'Cena de cierre de mes',
        amount: 62000,
        createdAt: 24,
      },
    ],
  },
];
