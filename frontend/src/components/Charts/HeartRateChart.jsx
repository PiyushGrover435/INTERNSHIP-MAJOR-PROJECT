import React from 'react';
import { Line } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import './ChartSetup';
import { Heart } from 'lucide-react';

const HeartRateChart = ({ height = 200 }) => {
  const { history } = useApp();

  const data = {
    labels: history.labels,
    datasets: [{
      label: 'Heart Rate (BPM)',
      data: history.heartRate,
      borderColor: '#ff0080',
      backgroundColor: 'rgba(255, 0, 128, 0.08)',
      borderWidth: 2,
      pointBackgroundColor: '#ff0080',
      pointBorderColor: '#ff0080',
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
        borderColor: '#ff0080',
        borderWidth: 1,
        titleColor: '#ff0080',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        callbacks: { label: ctx => ` ${ctx.raw} BPM` },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { maxTicksLimit: 6, color: '#64748b' } },
      y: { min: 40, max: 180, grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { color: '#64748b' } },
    },
  };

  return (
    <div className="glass rounded-2xl p-4 neon-border-pink">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="w-4 h-4 text-cyber-neonPink" />
        <h3 className="text-sm font-semibold text-cyber-text">Heart Rate</h3>
        <span className="ml-auto text-xs font-mono text-cyber-neonPink">
          {history.heartRate.length > 0 ? `${history.heartRate[history.heartRate.length - 1]} BPM` : '-- BPM'}
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

export default HeartRateChart;
