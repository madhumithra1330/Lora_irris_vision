import React from 'react';
import { useMoistureAnalytics, useAnalytics } from '../hooks/useAdminData';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import LoadingSkeleton from '../components/LoadingSkeleton';
import EmptyState from '../components/EmptyState';
import { Leaf, Thermometer, Droplet, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
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

export default function FarmAnalyticsPage() {
  const { data: moistureData, isLoading: loadingMoisture, refetch: refetchMoisture } = useMoistureAnalytics();
  const { data: generalData, isLoading: loadingGeneral } = useAnalytics();

  if (loadingMoisture || loadingGeneral) return <LoadingSkeleton type="card" count={4} />;
  if (!moistureData || !generalData) {
    return (
      <EmptyState
        icon={Leaf}
        title="Farm Analytics Unavailable"
        description="Could not load agricultural moisture and climate analytics from server."
        onAction={refetchMoisture}
      />
    );
  }

  const { overview, nodesRequiringAttention, timeSeries } = moistureData;

  const cropDistribution = [
    { name: 'Tomato', avgMoisture: 58.7 },
    { name: 'Rice Paddy', avgMoisture: 85.4 },
    { name: 'Cotton', avgMoisture: 45.1 },
    { name: 'Sugarcane', avgMoisture: 58.9 },
    { name: 'Wheat', avgMoisture: 71.8 },
    { name: 'Mango Orchard', avgMoisture: 68.5 }
  ];

  return (
    <div className="space-y-8 animate-fade-in-up">
      
      {/* Overview stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Average Soil Moisture"
          value={`${overview.averageMoisture}%`}
          subStats="Average moisture reading across active sensors"
          icon={Leaf}
          colorClass="text-status-healthy"
        />
        <KPICard
          title="Attention Required"
          value={overview.nodesRequiringAttentionCount}
          subStats="Field nodes with soil moisture below 30%"
          icon={Activity}
          colorClass="text-status-critical"
        />
        <KPICard
          title="Lowest Soil Moisture"
          value={overview.lowestMoisture ? `${overview.lowestMoisture.value}%` : '--'}
          subStats={overview.lowestMoisture ? overview.lowestMoisture.name : 'No data'}
          icon={ArrowDownRight}
          colorClass="text-status-critical"
        />
        <KPICard
          title="Highest Soil Moisture"
          value={overview.highestMoisture ? `${overview.highestMoisture.value}%` : '--'}
          subStats={overview.highestMoisture ? overview.highestMoisture.name : 'No data'}
          icon={ArrowUpRight}
          colorClass="text-status-healthy"
        />
      </div>

      {/* Climate KPIs (Temp/Humidity) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-field-border p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4 border-r border-field-border last:border-0 pr-6">
          <div className="rounded-xl bg-amber-50 p-3 text-status-warning border border-amber-100">
            <Thermometer size={20} />
          </div>
          <div>
            <p className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Average Temperature</p>
            <p className="text-xl font-bold font-display text-field-text-primary">{generalData.temperature?.avg}°C</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-r border-field-border last:border-0 pr-6 pl-6">
          <div className="rounded-xl bg-teal-50 p-3 text-teal-650 border border-teal-100">
            <Droplet size={20} />
          </div>
          <div>
            <p className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Average Air Humidity</p>
            <p className="text-xl font-bold font-display text-field-text-primary">{generalData.humidity?.avg}%</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-r border-field-border last:border-0 pl-6">
          <div className="rounded-xl bg-emerald-50 p-3 text-field-primary border border-emerald-100">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-[10px] text-field-text-secondary uppercase tracking-wider font-semibold">Irrigation Activities</p>
            <p className="text-xl font-bold font-display text-field-text-primary">
              {generalData.irrigationActivity?.pumpEventsCount + generalData.irrigationActivity?.valveEventsCount} Events
            </p>
          </div>
        </div>
      </div>

      {/* Recharts panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Moisture Trend line */}
        <ChartCard 
          title="Soil Moisture Trend" 
          subtitle="Average moisture level across all field sensors over the last 7 days"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries}>
              <defs>
                <linearGradient id="colorMoistTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#237A4B" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#237A4B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-field-border)" />
              <XAxis dataKey="name" stroke="#5F6D64" fontSize={10} />
              <YAxis stroke="#5F6D64" fontSize={10} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#DDE5DF', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', color: '#17211B' }}
                labelStyle={{ fontSize: '10px', color: '#5F6D64' }}
                formatter={(val) => [`${val}%`, 'Soil Moisture']}
              />
              <Area type="monotone" dataKey="avgMoisture" stroke="#237A4B" strokeWidth={2.5} fillOpacity={1} fill="url(#colorMoistTrend)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Moisture by crop type */}
        <ChartCard 
          title="Moisture by Crop Group" 
          subtitle="Side-by-side comparison of average moisture level across crops"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cropDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-field-border)" />
              <XAxis dataKey="name" stroke="#5F6D64" fontSize={10} />
              <YAxis stroke="#5F6D64" fontSize={10} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#DDE5DF', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px', color: '#17211B' }}
                labelStyle={{ fontSize: '10px', color: '#5F6D64' }}
                formatter={(val) => [`${val}%`, 'Avg Moisture']}
              />
              <Bar dataKey="avgMoisture" fill="#237A4B" radius={[6, 6, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* Nodes requiring attention row list */}
      <div className="rounded-2xl border border-field-border bg-field-card p-6 shadow-card space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-field-text-secondary">Sensors Requiring Irrigation Attention</h3>
          <p className="text-xs text-field-text-secondary/70 mt-1">Field nodes currently recording soil moisture levels below 30%</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodesRequiringAttention.length === 0 ? (
            <p className="col-span-full text-center text-xs text-field-text-secondary py-6">All connected sensors have optimal soil moisture levels.</p>
          ) : (
            nodesRequiringAttention.map(node => (
              <div key={node.id} className="rounded-xl border border-rose-100 bg-rose-50 p-4 flex justify-between items-center text-xs text-status-critical shadow-sm">
                <div>
                  <p className="font-bold text-field-text-primary font-display">{node.id}</p>
                  <p className="text-field-text-secondary text-[10px] mt-0.5">{node.crop_name}</p>
                  <p className="text-[10px] font-medium text-field-text-secondary mt-2">💧 Soil Moisture: <span className="font-bold text-status-critical">{node.soil_moisture}%</span></p>
                </div>
                <span className="bg-rose-100 border border-rose-200 text-status-critical font-bold px-2.5 py-1 rounded-full uppercase text-[9px] tracking-wider animate-pulse">
                  Dry
                </span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
