import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, BarChart3, PieChart, MousePointerClick } from 'lucide-react';

// Utility function to sample data for performance optimization
const sampleData = (data: any[], maxPoints: number) => {
  if (data.length <= maxPoints) return data;
  
  const sampled = [];
  const step = Math.ceil(data.length / maxPoints);
  
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  
  return sampled;
};

// Utility function to debounce function calls
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Custom tooltip component for better data presentation
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-medium text-gray-900 dark:text-white">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
            {entry.unit && ` ${entry.unit}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// Clickable legend component
const ClickableLegend = ({ payload, onClick }: any) => {
  const [activeItems, setActiveItems] = useState(payload.map((item: any) => item.dataKey || item.value));
  
  const handleClick = (dataKey: string) => {
    const newActiveItems = activeItems.includes(dataKey)
      ? activeItems.filter((item: string) => item !== dataKey)
      : [...activeItems, dataKey];
    
    setActiveItems(newActiveItems);
    onClick && onClick(newActiveItems);
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center mt-2">
      {payload.map((entry: any, index: number) => (
        <div 
          key={`legend-item-${index}`}
          className={`flex items-center gap-2 cursor-pointer px-3 py-1 rounded-full transition-all duration-200 ${
            activeItems.includes(entry.dataKey || entry.value)
              ? 'bg-gray-100 dark:bg-gray-700'
              : 'opacity-50'
          }`}
          onClick={() => handleClick(entry.dataKey || entry.value)}
        >
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          ></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Enhanced pie chart component
interface EnhancedPieChartProps {
  data: { name: string; value: number }[];
  title: string;
  colors?: string[];
  height?: number;
  onSegmentClick?: (data: any) => void;
  maxDataPoints?: number; // New prop for performance optimization
  showValue?: boolean; // New prop to show actual values instead of percentages
}

const EnhancedPieChart: React.FC<EnhancedPieChartProps> = ({ 
  data, 
  title, 
  colors = ['#10B981', '#EF4444', '#3B82F6', '#8B5CF6', '#F59E0B'],
  height = 300,
  onSegmentClick,
  maxDataPoints = 100, // Default limit for performance
  showValue = false // Default to showing percentages
}) => {
  // Optimize data for performance
  // Determine colors based on data
  const chartColors = useMemo(() => {
    // If we have a "No Variances" entry, use a neutral color
    if (data.length === 1 && data[0].name === 'No Variances') {
      return ['#9CA3AF']; // Gray color for no variances
    }
    return colors;
  }, [data, colors]);

  const optimizedData = useMemo(() => {
    // For pie charts, we'll aggregate small values into "Others" if needed
    if (data.length <= maxDataPoints) return data;
    
    // Sort by value descending and take top entries
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const topEntries = sorted.slice(0, maxDataPoints - 1);
    const othersValue = sorted.slice(maxDataPoints - 1).reduce((sum, entry) => sum + entry.value, 0);
    
    if (othersValue > 0) {
      return [...topEntries, { name: 'Others', value: othersValue }];
    }
    
    return topEntries;
  }, [data, maxDataPoints]);

  // Calculate total for percentage calculations
  const total = useMemo(() => optimizedData.reduce((sum, entry) => sum + entry.value, 0), [optimizedData]);
  
  const handleSegmentClick = (data: any, index: number) => {
    if (onSegmentClick) {
      onSegmentClick({ ...data, color: colors[index % colors.length] });
    }
  };
  
  // Custom label function to show either percentages or actual values
  const renderLabel = ({ name, percent, value }: { name: string; percent: number; value: number }) => {
    // Special case for "No Variances"
    if (name === 'No Variances') {
      return 'No Variances';
    }
    
    // Special case for zero values
    if (value === 0) {
      return `${name}: 0`;
    }
    
    if (showValue) {
      return `${name}: ${value.toLocaleString()}`;
    }
    return `${name}: ${(percent * 100).toFixed(0)}%`;
  };
  
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PieChart className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <ResponsiveContainer width="100%" height={height}>
              <RechartsPieChart>
                <Pie
                  data={optimizedData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={renderLabel}
                  onClick={handleSegmentClick}
                  cursor="pointer"
                >
                  {optimizedData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={chartColors[index % chartColors.length]} 
                      stroke="none"
                      className="transition-all duration-200 hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  content={<CustomTooltip />} 
                  formatter={(value, name) => [
                    name === 'No Variances' ? 'No variances recorded' : 
                    (Number(value) === 0 ? '0' : 
                      (showValue ? value : `${((Number(value) / total) * 100).toFixed(1)}%`)), 
                    name === 'No Variances' ? '' : 
                      (Number(value) === 0 ? 'Count' : (showValue ? 'Count' : 'Percentage'))
                  ]}
                />
                <Legend 
                  layout="vertical" 
                  verticalAlign="middle" 
                  align="right"
                  formatter={(value, entry, index) => {
                    const dataEntry = optimizedData.find(d => d.name === value);
                    // Special case for "No Variances" - just show the name
                    if (value === 'No Variances') {
                      return (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {value}
                        </span>
                      );
                    }
                    // Special case for zero values
                    if (dataEntry?.value === 0) {
                      return (
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {value}: 0
                        </span>
                      );
                    }
                    return (
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {value}: {showValue ? dataEntry?.value.toLocaleString() : (total > 0 ? `${((dataEntry!.value / total) * 100).toFixed(1)}%` : '0%')}
                      </span>
                    );
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-col gap-2 min-w-[150px]">
            {optimizedData.map((entry, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => handleSegmentClick(entry, index)}
              >
                <div 
                  className="w-3 h-3 rounded-full group-hover:scale-125 transition-transform duration-200" 
                  style={{ backgroundColor: chartColors[index % chartColors.length] }}
                ></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  {entry.name}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                  {entry.value === 0 
                    ? '0'
                    : (showValue 
                      ? entry.value.toLocaleString()
                      : (total > 0 ? `${((entry.value / total) * 100).toFixed(1)}%` : '0%'))}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Enhanced bar chart component
interface EnhancedBarChartProps {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  title: string;
  xAxisKey: string;
  height?: number;
  stacked?: boolean;
  onDataPointClick?: (data: any) => void;
  maxDataPoints?: number; // New prop for performance optimization
  debounceDelay?: number; // New prop for debouncing interactions
}

const EnhancedBarChart: React.FC<EnhancedBarChartProps> = ({ 
  data, 
  dataKeys, 
  title, 
  xAxisKey,
  height = 300,
  stacked = false,
  onDataPointClick,
  maxDataPoints = 50, // Default limit for performance
  debounceDelay = 100 // Default debounce delay
}) => {
  // Optimize data for performance
  const optimizedData = useMemo(() => sampleData(data, maxDataPoints), [data, maxDataPoints]);
  
  const [activeLegendItems, setActiveLegendItems] = useState(dataKeys.map(key => key.key));
  
  // Debounced legend click handler
  const debouncedLegendClick = useMemo(() => 
    debounce((activeItems: string[]) => setActiveLegendItems(activeItems), debounceDelay),
    [debounceDelay]
  );
  
  const handleLegendClick = (activeItems: string[]) => {
    debouncedLegendClick(activeItems);
  };
  
  // Debounced bar click handler
  const debouncedBarClick = useMemo(() => 
    debounce((data: any) => onDataPointClick && onDataPointClick(data), debounceDelay),
    [onDataPointClick, debounceDelay]
  );
  
  const handleBarClick = (data: any) => {
    debouncedBarClick(data);
  };
  
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="h-5 w-5" />
          {title}
          {data.length > maxDataPoints && (
            <span className="text-xs text-muted-foreground ml-2">
              (Showing {maxDataPoints} of {data.length} data points)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={optimizedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis 
              dataKey={xAxisKey} 
              angle={-45} 
              textAnchor="end" 
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              content={
                <ClickableLegend 
                  payload={dataKeys.map(key => ({ 
                    value: key.name, 
                    color: key.color, 
                    dataKey: key.key 
                  }))} 
                  onClick={handleLegendClick}
                />
              }
            />
            {dataKeys
              .filter(key => activeLegendItems.includes(key.key))
              .map((item, index) => (
                <Bar
                  key={index}
                  dataKey={item.key}
                  name={item.name}
                  fill={item.color}
                  stackId={stacked ? "a" : undefined}
                  radius={[4, 4, 0, 0]}
                  onClick={handleBarClick}
                  cursor="pointer"
                  className="transition-all duration-200 hover:opacity-80"
                />
              ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Enhanced area chart component
interface EnhancedAreaChartProps {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  title: string;
  xAxisKey: string;
  height?: number;
  onDataPointClick?: (data: any) => void;
  maxDataPoints?: number; // New prop for performance optimization
  debounceDelay?: number; // New prop for debouncing interactions
}

const EnhancedAreaChart: React.FC<EnhancedAreaChartProps> = ({ 
  data, 
  dataKeys, 
  title, 
  xAxisKey,
  height = 300,
  onDataPointClick,
  maxDataPoints = 50, // Default limit for performance
  debounceDelay = 100 // Default debounce delay
}) => {
  // Optimize data for performance
  const optimizedData = useMemo(() => sampleData(data, maxDataPoints), [data, maxDataPoints]);
  
  const [activeLegendItems, setActiveLegendItems] = useState(dataKeys.map(key => key.key));
  
  // Debounced legend click handler
  const debouncedLegendClick = useMemo(() => 
    debounce((activeItems: string[]) => setActiveLegendItems(activeItems), debounceDelay),
    [debounceDelay]
  );
  
  const handleLegendClick = (activeItems: string[]) => {
    debouncedLegendClick(activeItems);
  };
  
  // Debounced area click handler
  const debouncedAreaClick = useMemo(() => 
    debounce((data: any) => onDataPointClick && onDataPointClick(data), debounceDelay),
    [onDataPointClick, debounceDelay]
  );
  
  const handleAreaClick = (data: any) => {
    debouncedAreaClick(data);
  };
  
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          {title}
          {data.length > maxDataPoints && (
            <span className="text-xs text-muted-foreground ml-2">
              (Showing {maxDataPoints} of {data.length} data points)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={optimizedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis 
              dataKey={xAxisKey} 
              angle={-45} 
              textAnchor="end" 
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              content={
                <ClickableLegend 
                  payload={dataKeys.map(key => ({ 
                    value: key.name, 
                    color: key.color, 
                    dataKey: key.key 
                  }))} 
                  onClick={handleLegendClick}
                />
              }
            />
            {dataKeys
              .filter(key => activeLegendItems.includes(key.key))
              .map((item, index) => (
                <Area
                  key={index}
                  type="monotone"
                  dataKey={item.key}
                  name={item.name}
                  stroke={item.color}
                  fill={item.color}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  onClick={handleAreaClick}
                  cursor="pointer"
                  className="transition-all duration-200 hover:opacity-80"
                />
              ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Enhanced line chart component
interface EnhancedLineChartProps {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  title: string;
  xAxisKey: string;
  height?: number;
  onDataPointClick?: (data: any) => void;
  maxDataPoints?: number; // New prop for performance optimization
  debounceDelay?: number; // New prop for debouncing interactions
}

const EnhancedLineChart: React.FC<EnhancedLineChartProps> = ({ 
  data, 
  dataKeys, 
  title, 
  xAxisKey,
  height = 300,
  onDataPointClick,
  maxDataPoints = 100, // Default limit for performance
  debounceDelay = 100 // Default debounce delay
}) => {
  // Optimize data for performance
  const optimizedData = useMemo(() => sampleData(data, maxDataPoints), [data, maxDataPoints]);
  
  const [activeLegendItems, setActiveLegendItems] = useState(dataKeys.map(key => key.key));
  
  // Debounced legend click handler
  const debouncedLegendClick = useMemo(() => 
    debounce((activeItems: string[]) => setActiveLegendItems(activeItems), debounceDelay),
    [debounceDelay]
  );
  
  const handleLegendClick = (activeItems: string[]) => {
    debouncedLegendClick(activeItems);
  };
  
  // Debounced line click handler
  const debouncedLineClick = useMemo(() => 
    debounce((data: any) => onDataPointClick && onDataPointClick(data), debounceDelay),
    [onDataPointClick, debounceDelay]
  );
  
  const handleLineClick = (data: any) => {
    debouncedLineClick(data);
  };
  
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingDown className="h-5 w-5" />
          {title}
          {data.length > maxDataPoints && (
            <span className="text-xs text-muted-foreground ml-2">
              (Showing {maxDataPoints} of {data.length} data points)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={optimizedData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 60,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
            <XAxis 
              dataKey={xAxisKey} 
              angle={-45} 
              textAnchor="end" 
              height={60}
              tick={{ fontSize: 12 }}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              content={
                <ClickableLegend 
                  payload={dataKeys.map(key => ({ 
                    value: key.name, 
                    color: key.color, 
                    dataKey: key.key 
                  }))} 
                  onClick={handleLegendClick}
                />
              }
            />
            {dataKeys
              .filter(key => activeLegendItems.includes(key.key))
              .map((item, index) => (
                <Line
                  key={index}
                  type="monotone"
                  dataKey={item.key}
                  name={item.name}
                  stroke={item.color}
                  strokeWidth={2}
                  dot={{ r: 4, cursor: 'pointer' }}
                  activeDot={{ r: 6, cursor: 'pointer' }}
                  onClick={handleLineClick}
                  className="transition-all duration-200 hover:opacity-80"
                />
              ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

// Radar chart component for multi-dimensional data comparison
interface EnhancedRadarChartProps {
  data: any[];
  dataKeys: { key: string; name: string; color: string }[];
  title: string;
  height?: number;
  maxDataPoints?: number; // New prop for performance optimization
}

const EnhancedRadarChart: React.FC<EnhancedRadarChartProps> = ({ 
  data, 
  dataKeys, 
  title,
  height = 300,
  maxDataPoints = 20 // Default limit for performance
}) => {
  // Optimize data for performance
  const optimizedData = useMemo(() => sampleData(data, maxDataPoints), [data, maxDataPoints]);
  
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MousePointerClick className="h-5 w-5" />
          {title}
          {data.length > maxDataPoints && (
            <span className="text-xs text-muted-foreground ml-2">
              (Showing {maxDataPoints} of {data.length} data points)
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={optimizedData}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <PolarRadiusAxis />
            {dataKeys.map((item, index) => (
              <Radar
                key={index}
                name={item.name}
                dataKey={item.key}
                stroke={item.color}
                fill={item.color}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export { 
  EnhancedPieChart, 
  EnhancedBarChart, 
  EnhancedAreaChart, 
  EnhancedLineChart,
  EnhancedRadarChart,
  CustomTooltip,
  ClickableLegend
};