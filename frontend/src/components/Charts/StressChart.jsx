import React from 'react';
import { Line } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import './ChartSetup';
import { Brain } from 'lucide-react';

const StressChart = ({ height = 200 }) => {
  const { history } = useApp();

  const data = {
    labels: history.labels,
    datasets: [{
      label: 'Stress Level (%)',
      data: history.stress,
      borderColor: '#bf00ff',
      backgroundColor: 'rgba(191, 0, 255, 0.08)',
      borderWidth: 2,
      pointBackgroundColor: '#bf00ff',
      pointRadius: 3,
      pointHoverRadius: 6,
      tension: 0.4,
      fill: true,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: '#bf00ff',
        borderWidth: 1,
        titleColor: '#bf00ff',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: ctx => ` ${ctx.raw}%` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { maxTicksLimit: 6, color: '#64748b' } },
      y: { min: 0, max: 100, grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { color: '#64748b', callback: v => v + '%' } },
    },
  };

  const latest = history.stress[history.stress.length - 1];

  return (
    <div className="glass rounded-2xl p-4 neon-border-purple">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-cyber-text">Stress Level</h3>
        <span className="ml-auto text-xs font-mono text-purple-400">
          {latest !== undefined ? `${latest}%` : '--%'}
        </span>
      </div>
      <div style={{ height }}>
        {history.labels.length > 0
          ? <Line data={data} options={options} />
          : <div className="flex items-center justify-center h-full text-cyber-muted text-xs">Collecting data...</div>
        }
      </div>
    </div>
  );
};

export default StressChart;
