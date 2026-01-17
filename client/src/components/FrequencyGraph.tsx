import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FrequencyGraphProps {
  data: number[];
  height?: number;
  className?: string;
  color?: string;
}

export function FrequencyGraph({ data, height = 300, className, color = "#22c55e" }: FrequencyGraphProps) {
  // Transform raw frequency bin data into something Recharts can use
  // We will simply map indices to approximate frequencies for display
  // Assuming standard 44.1kHz or 48kHz, bin 0 is 0Hz, bin max is Nyquist.
  // For visualizer purposes, we often focus on 20Hz - 20kHz
  
  const chartData = useMemo(() => {
    // We'll just take the data as-is but label it roughly
    // Simple decimation if too many points
    const step = Math.ceil(data.length / 100); 
    const result = [];
    
    for (let i = 0; i < data.length; i += step) {
      // Rough Hz approximation just for label (assuming ~24kHz bandwidth across array)
      const hz = Math.round((i / data.length) * 20000);
      result.push({
        freq: hz,
        db: data[i], // normalized magnitude 0-255
      });
    }
    return result;
  }, [data]);

  return (
    <div className={className} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{
            top: 10,
            right: 0,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorDb" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="freq" 
            stroke="#666" 
            tick={{ fill: "#666", fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
            interval="preserveStartEnd"
          />
          <YAxis hide domain={[0, 255]} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#111', 
              borderColor: '#333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
              fontFamily: 'JetBrains Mono'
            }}
            itemStyle={{ color: color }}
            formatter={(val: number) => [`${Math.round((val/255)*100)}%`, 'Amplitude']}
            labelFormatter={(label) => `${label} Hz`}
          />
          <Area
            type="monotone"
            dataKey="db"
            stroke={color}
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorDb)"
            animationDuration={1000}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
