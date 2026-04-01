// File: services/frontend/src/components/AssetDetailCard.tsx

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssetById } from '@/features/assets/hooks/asset-hooks';
import { useAssetForecasts } from '@/features/forecast/hooks/forecast-hooks';
import { formatDistanceToNow } from 'date-fns';

interface AssetDetailCardProps {
  assetId: string;
  showForecast?: boolean;
}

export function AssetDetailCard({ assetId, showForecast = false }: AssetDetailCardProps) {
  const { data: asset, isLoading: assetLoading } = useAssetById(assetId);
  const { data: forecasts, isLoading: forecastLoading } = useAssetForecasts(assetId, {
    enabled: showForecast,
  });

  const [expanded, setExpanded] = useState(false);

  if (assetLoading) return <LoadingSkeleton />;
  if (!asset) return <EmptyState message="Asset not found" />;

  const totalCapacity = asset.units?.reduce((sum: number, u: any) => sum + u.capacity, 0) ?? 0;

  const latestForecast = forecasts?.sort(
    (a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];

  const utilizationRate =
    latestForecast && totalCapacity > 0
      ? ((latestForecast.production / totalCapacity) * 100).toFixed(1)
      : null;

  return (
    <Card>
      <CardHeader className="cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle>{asset.name}</CardTitle>
          <div className="flex items-center gap-2">
            <StatusIndicator status={asset.status} />
            <ChevronIcon direction={expanded ? 'up' : 'down'} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Last updated {formatDistanceToNow(new Date(asset.updatedAt))} ago
        </p>
      </CardHeader>

      {expanded && (
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <InfoRow label="Type" value={asset.type} />
            <InfoRow label="Location" value={asset.location ?? 'Not set'} />
            <InfoRow label="Total Capacity" value={`${totalCapacity} MW`} />
            {utilizationRate && <InfoRow label="Utilization" value={`${utilizationRate}%`} />}
          </div>

          {showForecast && latestForecast && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Latest Forecast</h4>
              <div className="grid grid-cols-3 gap-3">
                <ForecastMetric label="Production" value={`${latestForecast.production} MWh`} />
                <ForecastMetric label="Consumption" value={`${latestForecast.consumption} MWh`} />
                <ForecastMetric label="Net" value={`${latestForecast.production - latestForecast.consumption} MWh`} />
              </div>
            </div>
          )}

          {asset.units && asset.units.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Units ({asset.units.length})</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Capacity</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {asset.units.map((unit: any) => (
                    <tr key={unit.id} className="border-t">
                      <td className="py-2">{unit.name}</td>
                      <td className="py-2">{unit.capacity} MW</td>
                      <td className="py-2">
                        <StatusIndicator status={unit.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-2" />
      </CardHeader>
    </Card>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
    maintenance: 'bg-yellow-500',
    error: 'bg-red-500',
  };
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2 h-2 rounded-full ${colors[status] ?? 'bg-gray-400'}`} />
      <span className="text-sm capitalize">{status}</span>
    </div>
  );
}

function ChevronIcon({ direction }: { direction: 'up' | 'down' }) {
  return (
    <svg
      className={`w-4 h-4 transition-transform ${direction === 'up' ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ForecastMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
