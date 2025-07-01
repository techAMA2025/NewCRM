import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

import { chartOptions } from '../utils/chartConfigs';

interface LazyChartsProps {
  chartData: any;
}

const LazyCharts: React.FC<LazyChartsProps> = ({ chartData }) => {
  return (
    <div className="h-48">
      <Line data={chartData} options={chartOptions} />
    </div>
  );
};

export default LazyCharts; 