import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';

// Register all Chart.js components once
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

// Shared dark theme defaults
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.borderColor = 'rgba(26, 39, 68, 0.8)';
ChartJS.defaults.font.family = "'JetBrains Mono', monospace";
ChartJS.defaults.font.size = 10;

export const sharedLineOptions = (title, yLabel, yMin, yMax, color) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(10, 15, 30, 0.95)',
      borderColor: color,
      borderWidth: 1,
      titleColor: color,
      bodyColor: '#e2e8f0',
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(26,39,68,0.6)', drawBorder: false },
      ticks: { maxTicksLimit: 6, color: '#64748b' },
    },
    y: {
      min: yMin,
      max: yMax,
      grid: { color: 'rgba(26,39,68,0.6)', drawBorder: false },
      ticks: { color: '#64748b' },
      title: { display: !!yLabel, text: yLabel, color: '#64748b' },
    },
  },
});

export default {};
