import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

export type DateFilterPreset = 'day' | 'week' | 'month' | 'custom';

export interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  preset: DateFilterPreset;
  onPresetChange: (preset: DateFilterPreset) => void;
  className?: string;
}

const presetLabels: Record<DateFilterPreset, string> = {
  day: 'Hoje',
  week: 'Semana',
  month: 'Mês',
  custom: 'Personalizado',
};

export function getDateRangeForPreset(preset: DateFilterPreset): DateRange {
  const now = new Date();
  switch (preset) {
    case 'day':
      return { from: startOfDay(now), to: endOfDay(now) };
    case 'week':
      return { from: startOfWeek(now, { locale: ptBR }), to: endOfWeek(now, { locale: ptBR }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'custom':
      return { from: startOfMonth(now), to: endOfDay(now) };
  }
}

export function DateRangeFilter({ value, onChange, preset, onPresetChange, className }: DateRangeFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from?: Date; to?: Date }>({ from: value.from, to: value.to });

  const handlePreset = (p: DateFilterPreset) => {
    onPresetChange(p);
    if (p !== 'custom') {
      onChange(getDateRangeForPreset(p));
    } else {
      setTempRange({ from: value.from, to: value.to });
      setCalendarOpen(true);
    }
  };

  const handleCalendarSelect = (range: { from?: Date; to?: Date } | undefined) => {
    if (!range) return;
    setTempRange(range);
    if (range.from && range.to) {
      onChange({ from: startOfDay(range.from), to: endOfDay(range.to) });
      setCalendarOpen(false);
    }
  };

  const dateLabel = useMemo(() => {
    if (preset === 'custom' && value.from && value.to) {
      return `${format(value.from, 'dd/MM/yy', { locale: ptBR })} - ${format(value.to, 'dd/MM/yy', { locale: ptBR })}`;
    }
    return null;
  }, [preset, value]);

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {(['day', 'week', 'month', 'custom'] as DateFilterPreset[]).map((p) => (
        <Button
          key={p}
          size="sm"
          variant={preset === p ? 'default' : 'outline'}
          onClick={() => handlePreset(p)}
          className={cn(
            preset === p && 'bg-secondary text-secondary-foreground hover:bg-secondary/90'
          )}
        >
          {presetLabels[p]}
        </Button>
      ))}

      {preset === 'custom' && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {dateLabel || 'Selecionar período'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={tempRange as any}
              onSelect={handleCalendarSelect as any}
              numberOfMonths={2}
              locale={ptBR}
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {preset !== 'custom' && dateLabel === null && (
        <span className="text-sm text-muted-foreground ml-2">
          {format(value.from, "dd/MM", { locale: ptBR })} - {format(value.to, "dd/MM", { locale: ptBR })}
        </span>
      )}
    </div>
  );
}

export function useDateRangeFilter(defaultPreset: DateFilterPreset = 'month') {
  const [preset, setPreset] = useState<DateFilterPreset>(defaultPreset);
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPreset(defaultPreset));

  const filterByDate = <T,>(items: T[], getDate: (item: T) => string | Date): T[] => {
    return items.filter((item) => {
      const itemDate = new Date(getDate(item));
      return itemDate >= dateRange.from && itemDate <= dateRange.to;
    });
  };

  return {
    preset,
    setPreset,
    dateRange,
    setDateRange,
    filterByDate,
  };
}
