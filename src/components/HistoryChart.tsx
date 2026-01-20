'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { HistoricalPoint } from '@/lib/scraper';

interface Props {
    data: HistoricalPoint[];
    color?: string;
}

export default function HistoryChart({ data, color = '#38bdf8', unit = '' }: { data: any[], color?: string, unit?: string }) {
    if (!data || data.length === 0) return <div className="p-4 text-gray-500">No data available</div>;

    return (
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <LineChart data={data}>
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        tickFormatter={(val) => `${val}${unit}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f1f5f9' }}
                        itemStyle={{ color: color }}
                        labelStyle={{ color: '#94a3b8' }}
                        formatter={(value: any) => [`${Number(value).toFixed(2)}${unit}`, 'Return']}
                        labelFormatter={(label) => new Date(label).toDateString()}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
