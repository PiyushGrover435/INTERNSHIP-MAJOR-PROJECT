import React from 'react';
import { Line } from 'react-chartjs-2';
import { useApp } from '../../context/AppContext';
import './ChartSetup';
import { TrendingUp } from 'lucide-react';

const RiskHistoryChart = ({ height = 200 }) => {
  const { history } = useApp();

  const riskColors = history.risk.map(v =>
    v === 3 ? '#ff3d71' : v === 2 ? '#ffaa00' : '#00ff88'
  );

  const data = {
    labels: history.labels,
    datasets: [{
      label: 'AI Risk Level',
      data: history.risk,
      borderColor: '#00f5ff',
      backgroundColor: (ctx) => {
        const canvas = ctx.chart.ctx;
        const gradient = canvas.createLinearGradient(0, 0, 0, 160);
        gradient.addColorStop(0, 'rgba(0,245,255,0.3)');
        gradient.addColorStop(1, 'rgba(0,245,255,0)');
        return gradient;
      },
      borderWidth: 2,
      pointBackgroundColor: riskColors,
      pointBorderColor: riskColors,
      pointRadius: 5,
      pointHoverRadius: 8,
      tension: 0.3,
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
        borderColor: '#00f5ff',
        borderWidth: 1,
        titleColor: '#00f5ff',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: ctx => {
            const labels = ['', 'LOW', 'MEDIUM', 'HIGH'];
            return ` Risk: ${labels[ctx.raw] || ctx.raw}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { maxTicksLimit: 6, color: '#64748b' } },
      y: {
        min: 0, max: 4,
        grid: { color: 'rgba(26,39,68,0.6)' },
        ticks: {
          color: '#64748b',
          stepSize: 1,
          callback: v => ['', 'LOW', 'MED', 'HIGH', ''][v] || '',
        },
      },
    },
  };

  return (
    <div className="glass rounded-2xl p-4 neon-border-green">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-cyber-neonGreen" />
        <h3 className="text-sm font-semibold text-cyber-text">AI Risk History</h3>
        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono">
          <span className="text-cyber-neonGreen">■ LOW</span>
          <span className="text-yellow-400">■ MED</span>
          <span className="text-cyber-danger">■ HIGH</span>
        </div>
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

export default RiskHistoryChart;
