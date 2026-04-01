// File: services/frontend/src/app/pages/savings-reporting/SavingsReportingPage.tsx

import { useState, useMemo, useCallback } from 'react';
import { ContentLayout } from '@/components/layouts/ContentLayout';
import { useAssets } from '@/features/assets/hooks/asset-hooks';
import { useSavingsData } from '@/features/savings/hooks/savings-hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { format, subDays, eachDayOfInterval } from 'date-fns';

function SavingsHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1 mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function SavingsMetricCard({ label, value, trend }: { label: string; value: string; trend?: number }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px', backgroundColor: 'white' }}>
      <p style={{ color: '#6b7280', fontSize: '14px' }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{value}</p>
      {trend !== undefined && (
        <span style={{ color: trend >= 0 ? '#22c55e' : '#ef4444', fontSize: '12px' }}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
  );
}

function CustomBadge({ children, variant }: { children: React.ReactNode; variant: 'success' | 'warning' | 'error' }) {
  const colors = {
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
  };
  return (
    <span className={cn('px-2 py-1 rounded-full text-xs font-medium', colors[variant])}>
      {children}
    </span>
  );
}

function CustomTooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-50">
          {content}
        </div>
      )}
    </div>
  );
}

export function SavingsReportingPage() {
  const { data: assets } = useAssets();
  const { data: savingsData, isLoading } = useSavingsData();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  const filteredSavings = useMemo(() => {
    if (!savingsData) return [];
    const cutoff = subDays(new Date(), selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90);
    return savingsData.filter((s) => new Date(s.date) >= cutoff);
  }, [savingsData, selectedPeriod]);

  const totalSavings = useMemo(() => {
    return filteredSavings.reduce((sum, s) => sum + s.amount, 0);
  }, [filteredSavings]);

  const avgDailySavings = useMemo(() => {
    if (filteredSavings.length === 0) return 0;
    return totalSavings / filteredSavings.length;
  }, [totalSavings, filteredSavings]);

  const savingsByCategory = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredSavings.forEach((s) => {
      categories[s.category] = (categories[s.category] || 0) + s.amount;
    });
    return Object.entries(categories)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredSavings]);

  const handlePeriodChange = useCallback((period: '7d' | '30d' | '90d') => {
    setSelectedPeriod(period);
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount);
  }, []);

  if (isLoading) return <div>Loading...</div>;

  return (
    <ContentLayout>
      <SavingsHeader title="Savings Report" subtitle="Track your energy cost savings over time" />

      <div className="flex gap-2 mb-6">
        {(['7d', '30d', '90d'] as const).map((period) => (
          <button
            key={period}
            onClick={() => handlePeriodChange(period)}
            className={cn(
              'px-4 py-2 rounded-md text-sm font-medium',
              selectedPeriod === period ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
            )}
          >
            {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <SavingsMetricCard label="Total Savings" value={formatCurrency(totalSavings)} />
        <SavingsMetricCard label="Daily Average" value={formatCurrency(avgDailySavings)} />
        <SavingsMetricCard
          label="Categories"
          value={savingsByCategory.length.toString()}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Savings by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savingsByCategory.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{cat.name}</span>
                  <CustomTooltip content={`${((cat.amount / totalSavings) * 100).toFixed(1)}% of total savings`}>
                    <span className="text-gray-400 cursor-help">ⓘ</span>
                  </CustomTooltip>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono">{formatCurrency(cat.amount)}</span>
                  <CustomBadge variant={cat.amount > 1000 ? 'success' : cat.amount > 500 ? 'warning' : 'error'}>
                    {cat.amount > 1000 ? 'High' : cat.amount > 500 ? 'Medium' : 'Low'}
                  </CustomBadge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
