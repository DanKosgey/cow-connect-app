import React from 'react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';

// Color palette for charts
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Enhanced Bar Chart Component
export const EnhancedBarChart = ({ 
  data, 
  dataKey, 
  title,
  height = 300
}: { 
  data: any[]; 
  dataKey: string; 
  title?: string;
  height?: number;
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 50,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey={dataKey} 
              fill={COLORS[0]} 
              name={dataKey}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Enhanced Line Chart Component
export const EnhancedLineChart = ({ 
  data, 
  dataKeys, 
  title,
  height = 300
}: { 
  data: any[]; 
  dataKeys: string[]; 
  title?: string;
  height?: number;
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 50,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                dot={{ fill: COLORS[index % COLORS.length], r: 4 }}
                activeDot={{ r: 6 }}
                name={key}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Enhanced Area Chart Component
export const EnhancedAreaChart = ({ 
  data, 
  dataKey, 
  title,
  height = 300
}: { 
  data: any[]; 
  dataKey: string; 
  title?: string;
  height?: number;
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 50,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="name" 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={COLORS[0]}
              fill={COLORS[0]}
              fillOpacity={0.2}
              name={dataKey}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Enhanced Pie Chart Component
export const EnhancedPieChart = ({ 
  data, 
  dataKey, 
  nameKey,
  title,
  height = 300
}: { 
  data: any[]; 
  dataKey: string; 
  nameKey: string;
  title?: string;
  height?: number;
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [value, dataKey]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Enhanced Radar Chart Component
export const EnhancedRadarChart = ({ 
  data, 
  dataKeys, 
  title,
  height = 300
}: { 
  data: any[]; 
  dataKeys: string[]; 
  title?: string;
  height?: number;
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            {dataKeys.map((key, index) => (
              <Radar
                key={key}
                name={key}
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.6}
              />
            ))}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Enhanced Scatter Chart Component
export const EnhancedScatterChart = ({ 
  data, 
  dataKeys, 
  title,
  height = 300
}: { 
  data: any[]; 
  dataKeys: [string, string]; 
  title?: string;
  height?: number;
}) => {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
            margin={{
              top: 20,
              right: 20,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey={dataKeys[0]} 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              type="number" 
              dataKey={dataKeys[1]} 
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
            />
            <ZAxis range={[100]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Scatter 
              name={`${dataKeys[0]} vs ${dataKeys[1]}`} 
              data={data} 
              fill={COLORS[0]} 
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Data visualization container with multiple chart types
export const DataVisualizationContainer = ({ 
  data, 
  chartType,
  title,
  options = {}
}: { 
  data: any[]; 
  chartType: 'bar' | 'line' | 'area' | 'pie' | 'radar' | 'scatter';
  title?: string;
  options?: any;
}) => {
  switch (chartType) {
    case 'bar':
      return <EnhancedBarChart data={data} dataKey={options.dataKey} title={title} />;
    case 'line':
      return <EnhancedLineChart data={data} dataKeys={options.dataKeys} title={title} />;
    case 'area':
      return <EnhancedAreaChart data={data} dataKey={options.dataKey} title={title} />;
    case 'pie':
      return <EnhancedPieChart data={data} dataKey={options.dataKey} nameKey={options.nameKey} title={title} />;
    case 'radar':
      return <EnhancedRadarChart data={data} dataKeys={options.dataKeys} title={title} />;
    case 'scatter':
      return <EnhancedScatterChart data={data} dataKeys={options.dataKeys} title={title} />;
    default:
      return <div>Unsupported chart type</div>;
  }
};