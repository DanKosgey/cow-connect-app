import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { ReactNode } from 'react';
import ReactDOM from 'react-dom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const defaultLineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

const defaultBarChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
    },
  },
};

interface ChartProps<T = any> {
  data: T[];
  xField: keyof T;
  yField: keyof T;
  title?: string;
  tooltip?: (point: T) => ReactNode;
  yFieldFormatter?: (value: number) => string;
}

export function LineChart<T>({
  data,
  xField,
  yField,
  title,
  tooltip,
  yFieldFormatter = (v) => v.toString(),
}: ChartProps<T>) {
  const chartData: ChartData<'line'> = {
    labels: data.map((item) => item[xField] as string),
    datasets: [
      {
        label: title || String(yField),
        data: data.map((item) => item[yField] as number),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    ...defaultLineChartOptions,
    plugins: {
      ...defaultLineChartOptions.plugins,
      tooltip: {
        enabled: !tooltip,
        external: tooltip
          ? function ({ chart, tooltip: tip }) {
              let tooltipEl = document.getElementById('chartjs-tooltip');
              if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.id = 'chartjs-tooltip';
                tooltipEl.innerHTML = '<div class="bg-white p-2 shadow rounded"></div>';
                document.body.appendChild(tooltipEl);
              }

              if (tip.opacity === 0) {
                tooltipEl.style.opacity = '0';
                return;
              }

              if (tip.body) {
                const point = data[tip.dataPoints[0].dataIndex];
                const content = tooltip(point);
                const div = tooltipEl.querySelector('div');
                if (div && content) {
                  div.innerHTML = '';
                  if (typeof content === 'string') {
                    div.innerHTML = content;
                  } else {
                    const wrapper = document.createElement('div');
                    ReactDOM.render(content as any, wrapper);
                    div.appendChild(wrapper);
                  }
                }
              }

              const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
              tooltipEl.style.opacity = '1';
              tooltipEl.style.left = positionX + tip.caretX + 'px';
              tooltipEl.style.top = positionY + tip.caretY + 'px';
              tooltipEl.style.position = 'absolute';
              tooltipEl.style.pointerEvents = 'none';
            }
          : undefined,
      },
    },
    scales: {
      ...defaultLineChartOptions.scales,
      y: {
        ...defaultLineChartOptions.scales?.y,
        ticks: {
          callback: (value) => {
            return yFieldFormatter(value as number);
          },
        },
      },
    },
  };

  return <Line options={options} data={chartData} />;
}

export function BarChart<T>({
  data,
  xField,
  yField,
  title,
  tooltip,
  yFieldFormatter = (v) => v.toString(),
}: ChartProps<T>) {
  const chartData: ChartData<'bar'> = {
    labels: data.map((item) => item[xField] as string),
    datasets: [
      {
        label: title || String(yField),
        data: data.map((item) => item[yField] as number),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  const options: ChartOptions<'bar'> = {
    ...defaultBarChartOptions,
    plugins: {
      ...defaultBarChartOptions.plugins,
      tooltip: {
        enabled: !tooltip,
        external: tooltip
          ? function ({ chart, tooltip: tip }) {
              let tooltipEl = document.getElementById('chartjs-tooltip');
              if (!tooltipEl) {
                tooltipEl = document.createElement('div');
                tooltipEl.id = 'chartjs-tooltip';
                tooltipEl.innerHTML = '<div class="bg-white p-2 shadow rounded"></div>';
                document.body.appendChild(tooltipEl);
              }

              if (tip.opacity === 0) {
                tooltipEl.style.opacity = '0';
                return;
              }

              if (tip.body) {
                const point = data[tip.dataPoints[0].dataIndex];
                const content = tooltip(point);
                const div = tooltipEl.querySelector('div');
                if (div && content) {
                  div.innerHTML = '';
                  if (typeof content === 'string') {
                    div.innerHTML = content;
                  } else {
                    const wrapper = document.createElement('div');
                    ReactDOM.render(content as any, wrapper);
                    div.appendChild(wrapper);
                  }
                }
              }

              const { offsetLeft: positionX, offsetTop: positionY } = chart.canvas;
              tooltipEl.style.opacity = '1';
              tooltipEl.style.left = positionX + tip.caretX + 'px';
              tooltipEl.style.top = positionY + tip.caretY + 'px';
              tooltipEl.style.position = 'absolute';
              tooltipEl.style.pointerEvents = 'none';
            }
          : undefined,
      },
    },
    scales: {
      ...defaultBarChartOptions.scales,
      y: {
        ...defaultBarChartOptions.scales?.y,
        ticks: {
          callback: (value) => {
            return yFieldFormatter(value as number);
          },
        },
      },
    },
  };

  return <Bar options={options} data={chartData} />;
}