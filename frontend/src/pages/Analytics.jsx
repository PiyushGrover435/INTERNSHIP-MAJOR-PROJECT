import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Line, Bar } from 'react-chartjs-2';
import '../components/Charts/ChartSetup';
import { BarChart2, Download, FileText, Heart, Brain, Move } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Analytics = () => {
  const { history, sensorData } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const reportRef = useRef(null);

  // Compute stats
  const avg = (arr) => arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 0;
  const max = (arr) => arr.length ? Math.max(...arr).toFixed(1) : 0;
  const min = (arr) => arr.length ? Math.min(...arr).toFixed(1) : 0;

  const exportCSV = () => {
    const rows = [
      ['Time', 'Heart Rate (BPM)', 'Stress (%)', 'Motion (m/s²)', 'Risk'],
      ...history.labels.map((t, i) => [
        t,
        history.heartRate[i] || '',
        history.stress[i] || '',
        history.motion[i] || '',
        ['', 'LOW', 'MEDIUM', 'HIGH'][history.risk[i]] || '',
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neurowatch_data_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    const canvas = await html2canvas(reportRef.current, { backgroundColor: '#050816', scale: 2 });
    const img = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4');
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;
    pdf.addImage(img, 'PNG', 0, 0, w, h);
    pdf.save(`neurowatch_report_${Date.now()}.pdf`);
  };

  const combinedData = {
    labels: history.labels,
    datasets: [
      {
        label: 'Heart Rate',
        data: history.heartRate,
        borderColor: '#ff0080',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        yAxisID: 'y',
      },
      {
        label: 'Stress %',
        data: history.stress,
        borderColor: '#bf00ff',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        yAxisID: 'y',
      },
      {
        label: 'Motion',
        data: history.motion,
        borderColor: '#00f5ff',
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 2,
        yAxisID: 'y1',
      },
    ],
  };

  const combinedOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: { color: '#64748b', boxWidth: 12, font: { size: 10 } },
      },
      tooltip: {
        backgroundColor: 'rgba(10,15,30,0.95)',
        borderColor: '#1a2744',
        borderWidth: 1,
        titleColor: '#00f5ff',
        bodyColor: '#e2e8f0',
        padding: 10,
        cornerRadius: 8,
      },
    },
    scales: {
      x: { grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { maxTicksLimit: 8, color: '#64748b' } },
      y: { position: 'left', grid: { color: 'rgba(26,39,68,0.6)' }, ticks: { color: '#64748b' } },
      y1: { position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#64748b' } },
    },
  };

  const tabs = ['overview', 'heartrate', 'stress', 'motion'];

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-cyber-text flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyber-neon" />
            Analytics & Reports
          </h1>
          <p className="text-xs text-cyber-muted mt-1">Historical trends from current session</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-cyber-border
              text-xs text-cyber-muted hover:text-cyber-neon hover:border-cyber-neon/30 transition-all">
            <FileText className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyber-neon/10 border border-cyber-neon/30
              text-xs text-cyber-neon hover:bg-cyber-neon/20 transition-all">
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-3 md:grid-cols-9 gap-3" ref={reportRef}>
        {[
          { label: 'Avg HR', value: avg(history.heartRate), unit: 'BPM', color: 'text-cyber-neonPink', icon: Heart },
          { label: 'Max HR', value: max(history.heartRate), unit: 'BPM', color: 'text-cyber-danger', icon: Heart },
          { label: 'Min HR', value: min(history.heartRate), unit: 'BPM', color: 'text-cyber-neonGreen', icon: Heart },
          { label: 'Avg Stress', value: avg(history.stress), unit: '%', color: 'text-purple-400', icon: Brain },
          { label: 'Max Stress', value: max(history.stress), unit: '%', color: 'text-cyber-danger', icon: Brain },
          { label: 'Min Stress', value: min(history.stress), unit: '%', color: 'text-cyber-neonGreen', icon: Brain },
          { label: 'Avg Motion', value: avg(history.motion), unit: 'm/s²', color: 'text-cyber-neon', icon: Move },
          { label: 'Max Motion', value: max(history.motion), unit: 'm/s²', color: 'text-yellow-400', icon: Move },
          { label: 'Data Points', value: history.labels.length, unit: 'readings', color: 'text-cyber-neon', icon: BarChart2 },
        ].map(({ label, value, unit, color, icon: Icon }) => (
          <div key={label} className="glass rounded-xl p-3 border border-cyber-border text-center">
            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
            <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
            <div className="text-[10px] text-cyber-muted">{label}</div>
          </div>
        ))}
      </div>

      {/* Chart tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all
              ${activeTab === tab
                ? 'bg-cyber-neon/10 border border-cyber-neon/30 text-cyber-neon'
                : 'glass border border-cyber-border text-cyber-muted hover:text-cyber-text'}`}>
            {tab === 'overview' ? '📊 All Metrics' : tab === 'heartrate' ? '❤️ Heart Rate' : tab === 'stress' ? '🧠 Stress' : '🏃 Motion'}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className="glass rounded-2xl p-5 neon-border-cyan">
        <div style={{ height: 320 }}>
          {history.labels.length === 0 ? (
            <div className="flex items-center justify-center h-full text-cyber-muted text-sm">
              Collecting data... Dashboard will populate after first sensor readings.
            </div>
          ) : activeTab === 'overview' ? (
            <Line data={combinedData} options={combinedOptions} />
          ) : activeTab === 'heartrate' ? (
            <Line data={{
              labels: history.labels,
              datasets: [{
                label: 'Heart Rate (BPM)', data: history.heartRate,
                borderColor: '#ff0080', backgroundColor: 'rgba(255,0,128,0.08)',
                borderWidth: 2, tension: 0.4, fill: true,
              }],
            }} options={{ ...combinedOptions, scales: { x: combinedOptions.scales.x, y: { ...combinedOptions.scales.y, min: 40, max: 180 } } }} />
          ) : activeTab === 'stress' ? (
            <Line data={{
              labels: history.labels,
              datasets: [{
                label: 'Stress (%)', data: history.stress,
                borderColor: '#bf00ff', backgroundColor: 'rgba(191,0,255,0.08)',
                borderWidth: 2, tension: 0.4, fill: true,
              }],
            }} options={{ ...combinedOptions, scales: { x: combinedOptions.scales.x, y: { ...combinedOptions.scales.y, min: 0, max: 100 } } }} />
          ) : (
            <Bar data={{
              labels: history.labels,
              datasets: [{
                label: 'Motion (m/s²)', data: history.motion,
                backgroundColor: history.motion.map(v => v > 7 ? 'rgba(255,61,113,0.7)' : v > 4 ? 'rgba(255,170,0,0.7)' : 'rgba(0,245,255,0.5)'),
                borderRadius: 4,
              }],
            }} options={{ ...combinedOptions, scales: { x: combinedOptions.scales.x, y: { ...combinedOptions.scales.y, min: 0, max: 12 } } }} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
