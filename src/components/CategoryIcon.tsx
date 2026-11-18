import {
  Bus,
  Clapperboard,
  Lightbulb,
  ShoppingBag,
  Utensils,
} from 'lucide-react';
import {
  ExpenseCategory,
  IncomeCategory,
  MovementType,
} from '../data/budgetData';

interface CategoryVisual {
  icon?: typeof Utensils;
  iconBg: string;
  iconColor: string;
  badgeText: string;
  barColor: string;
}

export const CATEGORY_VISUALS: Record<ExpenseCategory, CategoryVisual> = {
  Alimentación: {
    icon: Utensils,
    iconBg: 'bg-emerald-500/15 border-emerald-400/25',
    iconColor: 'text-emerald-400',
    badgeText: 'text-emerald-300 bg-emerald-500/15',
    barColor: '#2EE87A',
  },
  Transporte: {
    icon: Bus,
    iconBg: 'bg-sky-500/15 border-sky-400/25',
    iconColor: 'text-sky-400',
    badgeText: 'text-sky-300 bg-sky-500/15',
    barColor: '#38BDF8',
  },
  'Servicios públicos': {
    icon: Lightbulb,
    iconBg: 'bg-amber-500/15 border-amber-400/25',
    iconColor: 'text-amber-400',
    badgeText: 'text-amber-300 bg-amber-500/15',
    barColor: '#FBBF24',
  },
  'Ropa y compras personales': {
    icon: ShoppingBag,
    iconBg: 'bg-indigo-500/15 border-indigo-400/25',
    iconColor: 'text-indigo-400',
    badgeText: 'text-indigo-300 bg-indigo-500/15',
    barColor: '#818CF8',
  },
  'Entretenimiento y ocio': {
    icon: Clapperboard,
    iconBg: 'bg-rose-500/15 border-rose-400/25',
    iconColor: 'text-rose-400',
    badgeText: 'text-rose-300 bg-rose-500/15',
    barColor: '#FB7185',
  },
};

export function CategoryIcon({
  category,
  type = 'expense',
}: {
  category: ExpenseCategory | IncomeCategory;
  type?: MovementType;
}) {
  if (type === 'income') {
    return (
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-400/35 bg-emerald-500/20 text-base shadow-[0_0_12px_rgba(46,232,122,0.18)]"
        aria-hidden="true"
      >
        <span role="img" aria-label="Ingreso">
          💰
        </span>
      </div>
    );
  }

  const visual =
    CATEGORY_VISUALS[category as ExpenseCategory] ??
    CATEGORY_VISUALS['Alimentación'];
  const Icon = visual.icon ?? Utensils;

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border ${visual.iconBg}`}
      aria-hidden="true"
    >
      <Icon className={`h-4 w-4 ${visual.iconColor}`} strokeWidth={2} />
    </div>
  );
}
