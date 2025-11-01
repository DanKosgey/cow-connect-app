import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, subWeeks, subMonths, subYears, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface TimeframeSelectorProps {
  onTimeframeChange: (timeframe: string, startDate: Date, endDate: Date) => void;
  defaultValue?: string;
}

export const TimeframeSelector = ({ onTimeframeChange, defaultValue = 'month' }: TimeframeSelectorProps) => {
  const [timeframe, setTimeframe] = useState(defaultValue);

  useEffect(() => {
    updateTimeframe(timeframe);
  }, []);

  const updateTimeframe = (value: string) => {
    setTimeframe(value);
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (value) {
      case 'day':
        startDate = subDays(now, 1);
        break;
      case 'week':
        startDate = subDays(now, 7);
        break;
      case 'month':
        startDate = subDays(now, 30);
        break;
      case 'quarter':
        startDate = subDays(now, 90);
        break;
      case 'year':
        startDate = subDays(now, 365);
        break;
      default:
        startDate = subDays(now, 30);
    }

    onTimeframeChange(value, startDate, endDate);
  };

  return (
    <Select value={timeframe} onValueChange={updateTimeframe}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select timeframe" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="day">Daily</SelectItem>
        <SelectItem value="week">Weekly</SelectItem>
        <SelectItem value="month">Monthly</SelectItem>
        <SelectItem value="quarter">Quarterly</SelectItem>
        <SelectItem value="year">Yearly</SelectItem>
      </SelectContent>
    </Select>
  );
};