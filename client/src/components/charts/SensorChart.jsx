import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine
} from 'recharts';

const COLORS = {
  temperature: '#5bc4e8',
  humidity: '#22c97a',
  gas: '#f5a623',
};

const THRESHOLDS = {
  temperature: { min: 0, max: 4 },
  humidity: { min: 20, max: 90 },
  gas: { max: 500 },
};

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div style={{
      background: 'var(--navy-800)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: 'var(--white-dim)', marginBottom: 4, fontFamily: 'var(--font-data)' }}>{label}</div>
      <div style={{ color: COLORS[metric], fontFamily: 'var(--font-data)', fontWeight: 600 }}>
        {val?.toFixed(1)} {metric === 'temperature' ? '°C' : metric === 'humidity' ? '%' : 'ppm'}
      </div>
    </div>
  );
}

export default function SensorChart({ data, metric = 'temperature', height = 200 }) {
  const color = COLORS[metric];
  const thresh = THRESHOLDS[metric];

  const formatted = data.map(d => ({
    time: new Date(d.Timestamp).toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' }),
    value: d[metric === 'temperature' ? 'Temperature' : metric === 'humidity' ? 'Humidity' : 'Gas'],
  }));

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={formatted} margin={{ top: 8, right: 16, bottom: 0, left: -10 }}>
          <CartesianGrid stroke="rgba(91,196,232,0.06)" strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            tick={{ fill: 'var(--white-dim)', fontSize: 10, fontFamily: 'var(--font-data)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: 'var(--white-dim)', fontSize: 10, fontFamily: 'var(--font-data)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip metric={metric} />} />
          {thresh?.min !== undefined && (
            <ReferenceLine y={thresh.min} stroke={color} strokeDasharray="4 4" strokeOpacity={0.4} />
          )}
          {thresh?.max !== undefined && (
            <ReferenceLine y={thresh.max} stroke={color} strokeDasharray="4 4" strokeOpacity={0.4} />
          )}
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color, stroke: 'var(--navy)', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
