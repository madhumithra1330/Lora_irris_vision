import React from 'react';
import { useWaterAnalytics } from '../hooks/useAdminData';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Droplets, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

export default function WaterAnalyticsPage() {
  const { data: analytics, isLoading, refetch } = useWaterAnalytics();

  if (isLoading) return <LoadingSkeleton type="card" count={4} />;
  if (!analytics) {
    return (
      <EmptyState
        icon={Droplets}
        title="Water Analytics Unavailable"
        description="Could not load water metrics from server."
        onAction={refetch}
      />
    );
  }

  const { overview, timeSeries, gateways } = analytics;

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* 4 KPI overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Average Water Level"
          value={`${overview.averageWaterLevel}%`}
          subStats="Average tank level across active farms"
          icon={Droplets}
          colorClass="text-status-info"
        />
        <KPICard
          title="Low Water central nodes"
          value={overview.lowWaterCount}
          subStats="Gateways with water levels below 20%"
          icon={AlertTriangle}
          colorClass="text-status-critical"
        />
        <KPICard
          title="Highest Water Level"
          value={overview.highestWaterLevel ? `${overview.highestWaterLevel.level}%` : '--'}
          subStats={overview.highestWaterLevel ? overview.highestWaterLevel.name : 'No data'}
          icon={ArrowUpRight}
          colorClass="text-status-healthy"
        />
        <KPICard
          title="Lowest Water Level"
          value={overview.lowestWaterLevel ? `${overview.lowestWaterLevel.level}%` : '--'}
          subStats={overview.lowestWaterLevel ? overview.lowestWaterLevel.name : 'No data'}
          icon={ArrowDownRight}
          colorClass="text-status-critical"
        />
      </div>

      {/* Recharts Graphics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: Average Tank Level Trend */}
        <ChartCard 
          title="Tank Level Trend" 
          subtitle="Average monitored water availability over the last 7 days"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorWaterTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563A6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563A6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-field-border)" />
              <XAxis dataKey="name" stroke="#5F6D64" fontSize={10} />
              <YAxis stroke="#5F6D64" fontSize={10} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#DDE5DF', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', color: '#17211B' }}
                labelStyle={{ fontSize: '10px', color: '#5F6D64' }}
                formatter={(val) => [`${val}%`, 'Avg Water Level']}
              />
              <Area type="monotone" dataKey="avgWaterLevel" stroke="#2563A6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorWaterTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Chart 2: Water Availability by Gateway */}
        <ChartCard 
          title="Water Availability by Central Node" 
          subtitle="Current tank level compared across all physical gateways"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gateways}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-field-border)" />
              <XAxis dataKey="name" stroke="#5F6D64" fontSize={9} tickLine={false} />
              <YAxis stroke="#5F6D64" fontSize={10} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#DDE5DF', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', color: '#17211B' }}
                labelStyle={{ fontSize: '10px', color: '#5F6D64' }}
                formatter={(val) => [`${val}%`, 'Water Level']}
              />
              <Bar dataKey="waterLevel" fill="#2563A6" radius={[6, 6, 0, 0]} maxBarSize={45}>
                {gateways.map((entry, index) => (
                  <rect 
                    key={`rect-${index}`} 
                    fill={entry.waterLevel < 20 ? '#C53D3D' : '#2563A6'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
