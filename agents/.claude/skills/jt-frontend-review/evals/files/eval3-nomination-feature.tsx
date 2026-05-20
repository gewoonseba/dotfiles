// File: services/frontend/src/features/nomination/components/NominationTable.tsx

import { useMemo, useState, useCallback, memo } from 'react';
import { format, parseISO, differenceInHours, eachHourOfInterval, startOfDay, endOfDay } from 'date-fns';

interface NominationEntry {
  id: string;
  assetId: string;
  assetName: string;
  timestamp: string;
  volume: number;
  price: number;
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  market: string;
}

interface NominationTableProps {
  nominations: NominationEntry[];
  selectedDate: Date;
  onSubmit: (ids: string[]) => void;
}

// Custom select dropdown
function SelectDropdown({
  options,
  value,
  onChange,
  placeholder,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative">
      <button
        className="w-full px-3 py-2 text-left border rounded-md bg-white text-sm flex items-center justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{options.find((o) => o.value === value)?.label || placeholder || 'Select...'}</span>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Custom input field
function NumberInput({
  value,
  onChange,
  min,
  max,
  step,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      min={min}
      max={max}
      step={step}
      className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}

// Custom button
function ActionButton({
  children,
  onClick,
  variant = 'primary',
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const baseStyles = 'px-4 py-2 rounded-md text-sm font-medium transition-colors';
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };
  return (
    <button className={`${baseStyles} ${variantStyles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

const NominationRow = memo(function NominationRow({
  nomination,
  isSelected,
  onToggle,
}: {
  nomination: NominationEntry;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const statusColors: Record<string, string> = {
    pending: 'text-yellow-600 bg-yellow-50',
    submitted: 'text-blue-600 bg-blue-50',
    accepted: 'text-green-600 bg-green-50',
    rejected: 'text-red-600 bg-red-50',
  };

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="py-3 px-4">
        <input type="checkbox" checked={isSelected} onChange={() => onToggle(nomination.id)} />
      </td>
      <td className="py-3 px-4">{format(parseISO(nomination.timestamp), 'HH:mm')}</td>
      <td className="py-3 px-4">{nomination.assetName}</td>
      <td className="py-3 px-4 text-right font-mono">{nomination.volume.toFixed(2)} MWh</td>
      <td className="py-3 px-4 text-right font-mono">€{nomination.price.toFixed(2)}</td>
      <td className="py-3 px-4 text-right font-mono">€{(nomination.volume * nomination.price).toFixed(2)}</td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[nomination.status]}`}>
          {nomination.status}
        </span>
      </td>
      <td className="py-3 px-4">{nomination.market}</td>
    </tr>
  );
});

export function NominationTable({ nominations, selectedDate, onSubmit }: NominationTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof NominationEntry>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Compute hourly aggregates on the frontend
  const hourlyAggregates = useMemo(() => {
    const hours = eachHourOfInterval({
      start: startOfDay(selectedDate),
      end: endOfDay(selectedDate),
    });

    return hours.map((hour) => {
      const hourNominations = nominations.filter((n) => {
        const nDate = parseISO(n.timestamp);
        return nDate >= hour && differenceInHours(nDate, hour) < 1;
      });

      return {
        hour: format(hour, 'HH:mm'),
        totalVolume: hourNominations.reduce((sum, n) => sum + n.volume, 0),
        avgPrice:
          hourNominations.length > 0
            ? hourNominations.reduce((sum, n) => sum + n.price, 0) / hourNominations.length
            : 0,
        totalValue: hourNominations.reduce((sum, n) => sum + n.volume * n.price, 0),
        count: hourNominations.length,
      };
    });
  }, [nominations, selectedDate]);

  const markets = useMemo(() => {
    return [...new Set(nominations.map((n) => n.market))];
  }, [nominations]);

  const filteredNominations = useMemo(() => {
    let filtered = [...nominations];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((n) => n.status === statusFilter);
    }

    if (marketFilter !== 'all') {
      filtered = filtered.filter((n) => n.market === marketFilter);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return filtered;
  }, [nominations, statusFilter, marketFilter, sortField, sortDirection]);

  const summaryStats = useMemo(() => {
    return {
      totalVolume: filteredNominations.reduce((sum, n) => sum + n.volume, 0),
      totalValue: filteredNominations.reduce((sum, n) => sum + n.volume * n.price, 0),
      avgPrice:
        filteredNominations.length > 0
          ? filteredNominations.reduce((sum, n) => sum + n.price, 0) / filteredNominations.length
          : 0,
      pendingCount: filteredNominations.filter((n) => n.status === 'pending').length,
    };
  }, [filteredNominations]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === filteredNominations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNominations.map((n) => n.id)));
    }
  }, [selectedIds.size, filteredNominations]);

  const handleSubmit = useCallback(() => {
    const pendingSelected = filteredNominations
      .filter((n) => selectedIds.has(n.id) && n.status === 'pending')
      .map((n) => n.id);
    onSubmit(pendingSelected);
    setSelectedIds(new Set());
  }, [selectedIds, filteredNominations, onSubmit]);

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Volume</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{summaryStats.totalVolume.toFixed(2)} MWh</p>
        </div>
        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Total Value</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>€{summaryStats.totalValue.toFixed(2)}</p>
        </div>
        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Avg Price</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>€{summaryStats.avgPrice.toFixed(2)}/MWh</p>
        </div>
        <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px' }}>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>Pending</p>
          <p style={{ fontSize: '18px', fontWeight: 'bold' }}>{summaryStats.pendingCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="w-48">
          <SelectDropdown
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Submitted', value: 'submitted' },
              { label: 'Accepted', value: 'accepted' },
              { label: 'Rejected', value: 'rejected' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>
        <div className="w-48">
          <SelectDropdown
            options={[{ label: 'All Markets', value: 'all' }, ...markets.map((m) => ({ label: m, value: m }))]}
            value={marketFilter}
            onChange={setMarketFilter}
          />
        </div>
        <div className="ml-auto">
          <ActionButton
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
          >
            Submit Selected ({selectedIds.size})
          </ActionButton>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filteredNominations.length && filteredNominations.length > 0}
                  onChange={toggleAll}
                />
              </th>
              {['Time', 'Asset', 'Volume', 'Price', 'Value', 'Status', 'Market'].map((header) => (
                <th key={header} className="py-3 px-4 text-left text-sm font-medium text-gray-600">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredNominations.map((nomination) => (
              <NominationRow
                key={nomination.id}
                nomination={nomination}
                isSelected={selectedIds.has(nomination.id)}
                onToggle={toggleSelection}
              />
            ))}
          </tbody>
        </table>
      </div>

      {filteredNominations.length === 0 && (
        <div className="text-center py-8 text-gray-500">No nominations found for the selected filters.</div>
      )}
    </div>
  );
}
