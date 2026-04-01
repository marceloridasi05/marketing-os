import { useState, useMemo } from 'react';

export type TimePeriod =
  | 'all' | 'today' | 'yesterday' | 'last_7' | 'last_week'
  | 'this_month' | 'last_month'
  | 'h1_2026' | 'h2_2026' | 'last_quarter'
  | 'h1_2025' | 'h2_2025'
  | 'this_year'
  | 'custom';

export interface DateRange {
  start: string;
  end: string;
}

const fmt = (d: Date) => d.toISOString().slice(0, 10);

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

export function getDateRange(period: TimePeriod, customStart?: string, customEnd?: string): DateRange | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'all': return null;
    case 'today': return { start: fmt(today), end: fmt(today) };
    case 'yesterday': {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { start: fmt(y), end: fmt(y) };
    }
    case 'last_7': {
      const s = new Date(today); s.setDate(s.getDate() - 6);
      return { start: fmt(s), end: fmt(today) };
    }
    case 'last_week': {
      const thisMonday = startOfWeek(today);
      const lastMonday = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(lastMonday); lastSunday.setDate(lastSunday.getDate() + 6);
      return { start: fmt(lastMonday), end: fmt(lastSunday) };
    }
    case 'this_month': {
      const s = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: fmt(s), end: fmt(today) };
    }
    case 'last_month': {
      const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const e = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: fmt(s), end: fmt(e) };
    }
    case 'this_year': {
      return { start: `${today.getFullYear()}-01-01`, end: fmt(today) };
    }
    case 'h1_2026': return { start: '2026-01-01', end: '2026-06-30' };
    case 'h2_2026': return { start: '2026-07-01', end: '2026-12-31' };
    case 'last_quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const qStart = q === 0
        ? new Date(today.getFullYear() - 1, 9, 1)
        : new Date(today.getFullYear(), (q - 1) * 3, 1);
      const qEnd = q === 0
        ? new Date(today.getFullYear() - 1, 11, 31)
        : new Date(today.getFullYear(), q * 3, 0);
      return { start: fmt(qStart), end: fmt(qEnd) };
    }
    case 'h1_2025': return { start: '2025-01-01', end: '2025-06-30' };
    case 'h2_2025': return { start: '2025-07-01', end: '2025-12-31' };
    case 'custom': {
      if (customStart && customEnd) return { start: customStart, end: customEnd };
      return null;
    }
    default: return null;
  }
}

const PERIOD_OPTIONS: { value: TimePeriod; label: string; group: string }[] = [
  { value: 'all', label: 'Todo o período', group: 'Geral' },
  { value: 'this_year', label: 'Este ano', group: 'Geral' },
  { value: 'today', label: 'Hoje', group: 'Dias' },
  { value: 'yesterday', label: 'Ontem', group: 'Dias' },
  { value: 'last_7', label: 'Últimos 7 dias', group: 'Dias' },
  { value: 'last_week', label: 'Semana passada', group: 'Semanas' },
  { value: 'this_month', label: 'Mês atual', group: 'Meses' },
  { value: 'last_month', label: 'Mês passado', group: 'Meses' },
  { value: 'h1_2026', label: '1º Sem 2026', group: 'Semestres' },
  { value: 'h2_2026', label: '2º Sem 2026', group: 'Semestres' },
  { value: 'last_quarter', label: 'Último Trim.', group: 'Trimestres' },
  { value: 'h1_2025', label: '1º Sem 2025', group: 'Semestres' },
  { value: 'h2_2025', label: '2º Sem 2025', group: 'Semestres' },
  { value: 'custom', label: 'Personalizado', group: 'Outro' },
];

interface TimeFilterProps {
  value: TimePeriod;
  onChange: (period: TimePeriod) => void;
  customStart?: string;
  customEnd?: string;
  onCustomStartChange?: (v: string) => void;
  onCustomEndChange?: (v: string) => void;
  className?: string;
}

export function TimeFilter({ value, onChange, customStart, customEnd, onCustomStartChange, onCustomEndChange, className = '' }: TimeFilterProps) {
  const selectedLabel = PERIOD_OPTIONS.find(o => o.value === value)?.label ?? 'Selecionar';

  // Group options
  const groups = useMemo(() => {
    const map = new Map<string, typeof PERIOD_OPTIONS>();
    for (const o of PERIOD_OPTIONS) {
      if (!map.has(o.group)) map.set(o.group, []);
      map.get(o.group)!.push(o);
    }
    return [...map.entries()];
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value as TimePeriod)}
        className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white text-gray-700 font-medium focus:ring-1 focus:ring-gray-400 focus:border-gray-400 outline-none min-w-[160px]"
      >
        {groups.map(([group, opts]) => (
          <optgroup key={group} label={group}>
            {opts.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </optgroup>
        ))}
      </select>
      {value === 'custom' && (
        <>
          <input type="date" value={customStart ?? ''} onChange={e => onCustomStartChange?.(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
          <span className="text-gray-400 text-xs">a</span>
          <input type="date" value={customEnd ?? ''} onChange={e => onCustomEndChange?.(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm" />
        </>
      )}
    </div>
  );
}

// Hook for easy usage
export function useTimeFilter(defaultPeriod: TimePeriod = 'this_year') {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>(defaultPeriod);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dateRange = useMemo(
    () => getDateRange(timePeriod, customStart, customEnd),
    [timePeriod, customStart, customEnd]
  );

  const filterProps = {
    value: timePeriod,
    onChange: setTimePeriod,
    customStart,
    customEnd,
    onCustomStartChange: setCustomStart,
    onCustomEndChange: setCustomEnd,
  };

  return { timePeriod, dateRange, filterProps, setTimePeriod };
}
