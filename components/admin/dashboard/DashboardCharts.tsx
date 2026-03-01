import React from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface ChartPoint {
  label: string;
  value: number;
}

interface DashboardChartsProps {
  taskCompletionTrend: ChartPoint[];
  revenueByMonth: ChartPoint[];
  userRegistrations: ChartPoint[];
  projectStatusDistribution: { name: string; value: number }[];
}

const CHART_COLORS = ['#A3E635', '#84CC16', '#65A30D', '#4D7C0F'];

const TOOLTIP_STYLE = {
  background: '#1a1a2e',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  fontSize: 12,
};

const AXIS_TICK = { fontSize: 10, fill: 'var(--text-secondary, #9ca3af)' };

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  taskCompletionTrend, revenueByMonth, userRegistrations, projectStatusDistribution,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div className="bg-glass border border-border-color rounded-xl p-5">
      <h2 className="text-sm font-semibold text-text-primary mb-4">Task Completion (Last 30 Days)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={taskCompletionTrend}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} interval={4} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="value" stroke="#A3E635" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>

    <div className="bg-glass border border-border-color rounded-xl p-5">
      <h2 className="text-sm font-semibold text-text-primary mb-4">Revenue by Month (MAD)</h2>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={revenueByMonth}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Bar dataKey="value" fill="#A3E635" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="bg-glass border border-border-color rounded-xl p-5">
      <h2 className="text-sm font-semibold text-text-primary mb-4">User Registrations Over Time</h2>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={userRegistrations}>
          <defs>
            <linearGradient id="regGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#A3E635" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#A3E635" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} />
          <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Area type="monotone" dataKey="value" stroke="#A3E635" strokeWidth={2} fill="url(#regGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>

    <div className="bg-glass border border-border-color rounded-xl p-5">
      <h2 className="text-sm font-semibold text-text-primary mb-4">Project Status Distribution</h2>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={projectStatusDistribution}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {projectStatusDistribution.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary, #9ca3af)' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);
