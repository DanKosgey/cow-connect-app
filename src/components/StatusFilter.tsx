import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface StatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];
  placeholder?: string;
  label?: string;
}

const StatusFilter: React.FC<StatusFilterProps> = ({ 
  value, 
  onValueChange, 
  statusOptions, 
  placeholder = 'All Statuses',
  label = 'Filter by Status'
}) => {
  return (
    <div className="flex flex-col space-y-2">
      {label && (
        <Label className="text-sm font-medium">{label}</Label>
      )}
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {statusOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default StatusFilter;