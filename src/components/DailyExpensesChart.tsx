import {useMemo, useState} from 'react';
import {ChevronDown, TrendingUp} from 'lucide-react';
import {
  DailyExpense,
  EXPENSE_CATEGORIES,
  ExpenseCategory,
  formatCOP,
  formatCOPCompact,
  formatPercent,
  MONTHLY_BUDGETS,
} from '../data/budgetData';
import {CATEGORY_VISUALS} from './CategoryIcon';

interface DailyExpensesChartProps {
  monthId: string;
  monthLabel: string;
  monthAbbr: string;
  year: number;
  totalDays: number;
  currentDay: number;
  isCurrentMonth: boolean;
  monthlyBudget: number;
  totalSpent: number;
  expenses: DailyExpense[];
}

type ChartMode = 'bars' | 'spline';

interface DayPoint {
  day: number;
  dateLabel: string;
  amount: number;
  compareAmount: number;
  entries: DailyExpense[];
  isFuture: boolean;
}

function buildSmoothPath(points: {x: number; y: number}[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return path;
}

export function DailyExpensesChart({
  monthId,
  monthLabel,
  monthAbbr,
  year,
  totalDays,
  currentDay,
  isCurrentMonth,
  monthlyBudget,
  totalSpent,
  expenses,
}: DailyExpensesChartProps) {
  const [chartMode, setChartMode] = useState<ChartMode>('spline');
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | 'Todas'>('Todas');
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const comparisonMonth = useMemo(() => {
    return MONTHLY_BUDGETS.find((m) => m.id !== monthId) ?? MONTHLY_BUDGETS[0];
  }, [monthId]);

  const filteredExpenses = useMemo(() => {
    const onlyExpenses = expenses.filter((item) => item.type === 'expense');
    if (selectedCategory === 'Todas') return onlyExpenses;
    return onlyExpenses.filter((item) => item.category === selectedCategory);
  }, [expenses, selectedCategory]);

  const filteredCompareExpenses = useMemo(() => {
    const onlyExpenses = comparisonMonth.expenses.filter(
      (item) => item.type === 'expense',
    );
    if (selectedCategory === 'Todas') return onlyExpenses;
    return onlyExpenses.filter((item) => item.category === selectedCategory);
  }, [comparisonMonth, selectedCategory]);

  const daySeries: DayPoint[] = useMemo(() => {
    const byDay = new Map<number, DailyExpense[]>();
    for (const exp of filteredExpenses) {
      const list = byDay.get(exp.day) ?? [];
      list.push(exp);
      byDay.set(exp.day, list);
    }

    const compareByDay = new Map<number, number>();
    for (const exp of filteredCompareExpenses) {
      compareByDay.set(exp.day, (compareByDay.get(exp.day) ?? 0) + exp.amount);
    }

    const points: DayPoint[] = [];
    for (let day = 1; day <= totalDays; day++) {
      const entries = byDay.get(day) ?? [];
      const amount = entries.reduce((sum, item) => sum + item.amount, 0);
      const isFuture = isCurrentMonth && day > currentDay;
      points.push({
        day,
        dateLabel: `${day} ${monthAbbr} ${year}`,
        amount,
        compareAmount: compareByDay.get(day) ?? 0,
        entries,
        isFuture,
      });
    }
    return points;
  }, [
    filteredExpenses,
    filteredCompareExpenses,
    totalDays,
    currentDay,
    isCurrentMonth,
    monthAbbr,
    year,
  ]);

  const visibleDays = isCurrentMonth ? currentDay : totalDays;
  const displayPoints = daySeries.slice(0, visibleDays);

  const activePoint = useMemo(() => {
    if (hoveredDay !== null) {
      return displayPoints.find((p) => p.day === hoveredDay) ?? null;
    }
    return null;
  }, [hoveredDay, displayPoints]);

  const spentPercent =
    monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

  const yMax = useMemo(() => {
    const values = displayPoints.flatMap((d) => [d.amount, d.compareAmount]);
    const maxVal = Math.max(120000, ...values);
    const step = maxVal <= 150000 ? 40000 : 50000;
    return Math.ceil(maxVal / step) * step;
  }, [displayPoints]);

  const yTicks = useMemo(() => {
    return [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  }, [yMax]);

  const svgWidth = 740;
  const svgHeight = 278;
  const margin = {top: 48, right: 20, bottom: 50, left: 68};
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const slotWidth = plotWidth / Math.max(1, displayPoints.length);
  const barWidth = Math.max(10, Math.min(22, slotWidth * 0.58));

  const getY = (val: number) =>
    margin.top + plotHeight - Math.min(1, Math.max(0, val / yMax)) * plotHeight;

  const currentCurveCoords = displayPoints.map((pt, idx) => ({
    x: margin.left + (idx + 0.5) * slotWidth,
    y: getY(pt.amount),
  }));

  const compareCurveCoords = displayPoints.map((pt, idx) => ({
    x: margin.left + (idx + 0.5) * slotWidth,
    y: getY(pt.compareAmount),
  }));

  const currentSplinePath = buildSmoothPath(currentCurveCoords);
  const compareSplinePath = buildSmoothPath(compareCurveCoords);

  const shortCompareMonth = comparisonMonth.label.split(' ')[0];

  const activeIndex = activePoint
    ? displayPoints.findIndex((p) => p.day === activePoint.day)
    : -1;
  const activeCoord =
    activeIndex >= 0 ? currentCurveCoords[activeIndex] : null;

  return (
    <section
      id="grafico"
      aria-labelledby="grafico-gastos-titulo"
      className="flex w-full flex-col justify-between rounded-2xl border border-white/[0.06] bg-[#131720] p-5 sm:p-6"
    >
      <div>
        {/* Encabezado */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="grafico-gastos-titulo"
              className="text-sm font-medium text-slate-400"
            >
              Actividad diaria de gastos
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className="font-mono text-2xl font-bold tracking-tight text-white tabular-nums sm:text-[30px]">
                {formatCOP(
                  selectedCategory === 'Todas'
                    ? totalSpent
                    : filteredExpenses.reduce((s, e) => s + e.amount, 0),
                )}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                  spentPercent > 100 ? 'text-rose-400' : 'text-[#2EE87A]'
                }`}
              >
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                <span>{formatPercent(spentPercent)} del presupuesto</span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2.5 sm:items-end">
            <button
              type="button"
              onClick={() =>
                setChartMode((prev) => (prev === 'spline' ? 'bars' : 'spline'))
              }
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-[#1B202C] px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:text-white whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2EE87A]"
            >
              <span>{chartMode === 'spline' ? 'Curva diaria' : 'Barras diarias'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
            </button>

            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full bg-[#2EE87A]"
                  aria-hidden="true"
                />
                <span>{monthLabel.split(' ')[0]}</span>
              </span>
              {chartMode === 'spline' && (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full bg-[#5D6BF8]"
                    aria-hidden="true"
                  />
                  <span>Ref. {shortCompareMonth}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* SVG Chart con etiqueta visible del eje X y tooltip de fecha + monto al pasar el mouse */}
        <div
          className="mt-3 w-full"
          onMouseLeave={() => setHoveredDay(null)}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-auto w-full select-none overflow-visible"
            role="img"
            aria-label={`Gráfico de actividad diaria en ${monthLabel}`}
          >
            <defs>
              <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="4"
                  stdDeviation="4"
                  floodColor="#2EE87A"
                  floodOpacity="0.28"
                />
              </filter>
            </defs>

            {/* Gridlines horizontales y eje Y */}
            {yTicks.map((tick) => {
              const y = getY(tick);
              return (
                <g key={tick}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={svgWidth - margin.right}
                    y2={y}
                    stroke={
                      tick === 0
                        ? 'rgba(255,255,255,0.18)'
                        : 'rgba(255,255,255,0.08)'
                    }
                    strokeDasharray={tick === 0 ? undefined : '5 5'}
                    strokeWidth={1}
                  />
                  <text
                    x={margin.left - 12}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[11px]"
                  >
                    {formatCOPCompact(tick)}
                  </text>
                </g>
              );
            })}

            {chartMode === 'spline' ? (
              <>
                {compareSplinePath && (
                  <path
                    d={compareSplinePath}
                    fill="none"
                    stroke="#5D6BF8"
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.85}
                  />
                )}

                {currentSplinePath && (
                  <path
                    d={currentSplinePath}
                    fill="none"
                    stroke="#2EE87A"
                    strokeWidth={2.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#emeraldGlow)"
                  />
                )}

                {/* Puntos discretos por cada día */}
                {currentCurveCoords.map((coord, idx) => {
                  const pt = displayPoints[idx];
                  const isHovered = hoveredDay === pt.day;
                  return (
                    <circle
                      key={`pt-${pt.day}`}
                      cx={coord.x}
                      cy={coord.y}
                      r={isHovered ? 6 : pt.amount > 0 ? 3.2 : 2}
                      fill={isHovered ? '#131720' : '#2EE87A'}
                      stroke={isHovered ? '#FFFFFF' : '#131720'}
                      strokeWidth={isHovered ? 2.6 : 1}
                    />
                  );
                })}
              </>
            ) : (
              /* Modo barras diarias */
              displayPoints.map((pt, idx) => {
                const cx = margin.left + (idx + 0.5) * slotWidth;
                const barX = cx - barWidth / 2;
                const barY = getY(pt.amount);
                const height = Math.max(0, margin.top + plotHeight - barY);
                const isHovered = hoveredDay === pt.day;
                const fillColor = isHovered
                  ? '#2EE87A'
                  : selectedCategory === 'Todas'
                  ? '#5D6BF8'
                  : CATEGORY_VISUALS[selectedCategory].barColor;

                return (
                  <g key={`bar-${pt.day}`}>
                    <rect
                      x={barX}
                      y={pt.amount > 0 ? barY : margin.top + plotHeight - 3}
                      width={barWidth}
                      height={pt.amount > 0 ? Math.max(4, height) : 3}
                      rx={4}
                      fill={pt.amount > 0 ? fillColor : 'rgba(255,255,255,0.12)'}
                      className="transition-colors duration-150"
                    />
                  </g>
                );
              })
            )}

            {/* Etiquetas visibles del eje X (días del mes) */}
            {displayPoints.map((pt, idx) => {
              const step = displayPoints.length > 22 ? 3 : 2;
              const isHovered = hoveredDay === pt.day;
              const showTick =
                isHovered ||
                pt.day === 1 ||
                pt.day === displayPoints.length ||
                (pt.day - 1) % step === 0;
              if (!showTick) return null;

              const cx = margin.left + (idx + 0.5) * slotWidth;
              return (
                <g key={`xlabel-${pt.day}`}>
                  <line
                    x1={cx}
                    y1={margin.top + plotHeight}
                    x2={cx}
                    y2={margin.top + plotHeight + 4}
                    stroke={isHovered ? '#2EE87A' : 'rgba(255,255,255,0.22)'}
                    strokeWidth={1}
                  />
                  <text
                    x={cx}
                    y={margin.top + plotHeight + 17}
                    textAnchor="middle"
                    className={`font-sans text-[11px] ${
                      isHovered
                        ? 'fill-[#2EE87A] font-semibold'
                        : 'fill-slate-300'
                    }`}
                  >
                    {pt.day} {monthAbbr}
                  </text>
                </g>
              );
            })}

            {/* Título explícito y visible del eje X */}
            <text
              x={margin.left + plotWidth / 2}
              y={svgHeight - 6}
              textAnchor="middle"
              className="fill-slate-400 font-sans text-[11px] font-medium"
            >
              Días del mes ({monthLabel})
            </text>

            {/* Tooltip flotante con Fecha y Monto al pasar el mouse sobre cada barra o punto */}
            {activeCoord && activePoint && (
              <g pointerEvents="none">
                <line
                  x1={activeCoord.x}
                  y1={margin.top}
                  x2={activeCoord.x}
                  y2={margin.top + plotHeight}
                  stroke="rgba(255,255,255,0.18)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                {(() => {
                  const amountText = formatCOP(activePoint.amount);
                  const dateText = activePoint.dateLabel;
                  const boxWidth = Math.max(122, amountText.length * 7.6 + 22);
                  const boxHeight = 42;
                  const boxX = Math.min(
                    svgWidth - margin.right - boxWidth,
                    Math.max(margin.left, activeCoord.x - boxWidth / 2),
                  );
                  const boxY = Math.max(2, activeCoord.y - boxHeight - 10);

                  return (
                    <g>
                      <rect
                        x={boxX}
                        y={boxY}
                        width={boxWidth}
                        height={boxHeight}
                        rx={10}
                        fill="#1F2636"
                        stroke="rgba(46,232,122,0.5)"
                        strokeWidth={1.2}
                      />
                      <text
                        x={boxX + boxWidth / 2}
                        y={boxY + 16}
                        textAnchor="middle"
                        className="fill-slate-300 font-sans text-[10px] font-medium"
                      >
                        {dateText}
                      </text>
                      <text
                        x={boxX + boxWidth / 2}
                        y={boxY + 32}
                        textAnchor="middle"
                        className="fill-[#2EE87A] font-mono text-[12px] font-bold"
                      >
                        {amountText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Zonas interactivas invisibles para hover/click sobre cada barra o punto */}
            {displayPoints.map((pt, idx) => {
              const cx = margin.left + (idx + 0.5) * slotWidth;
              return (
                <rect
                  key={`hit-${pt.day}`}
                  x={cx - slotWidth / 2}
                  y={margin.top}
                  width={slotWidth}
                  height={plotHeight + 24}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredDay(pt.day)}
                  onClick={() => setHoveredDay(pt.day)}
                />
              );
            })}
          </svg>
        </div>
      </div>

      {/* Filtros por categoría */}
      <div className="mt-3 space-y-2.5 border-t border-white/[0.06] pt-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {activePoint
              ? `${activePoint.dateLabel}: ${formatCOP(activePoint.amount)}${
                  activePoint.entries[0]
                    ? ` · ${activePoint.entries[0].category}`
                    : ' · Sin gastos'
                }`
              : 'Pasa el cursor sobre cualquier punto o barra para ver fecha y monto'}
          </span>
        </div>

        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
          role="group"
          aria-label="Filtrar gráfico por categoría"
        >
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('Todas');
              setHoveredDay(null);
            }}
            className={`whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === 'Todas'
                ? 'bg-[#2EE87A] text-[#071A10]'
                : 'bg-[#1B202C] text-slate-400 hover:text-white'
            }`}
          >
            Todas
          </button>
          {EXPENSE_CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setSelectedCategory(category);
                  setHoveredDay(null);
                }}
                className={`whitespace-nowrap shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isSelected
                    ? 'bg-[#2EE87A] text-[#071A10]'
                    : 'bg-[#1B202C] text-slate-400 hover:text-white'
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
