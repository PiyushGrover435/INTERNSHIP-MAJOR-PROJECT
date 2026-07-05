import React from 'react';
import PredictionPanel from '../components/AI/PredictionPanel';
import RecommendationPanel from '../components/AI/RecommendationPanel';
import RiskHistoryChart from '../components/Charts/RiskHistoryChart';
import { Brain, Info } from 'lucide-react';

const AIPrediction = () => (
  <div className="p-4 md:p-6 space-y-6 animate-fade-in">
    <div>
      <h1 className="text-xl font-bold text-cyber-text flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-400" />
        AI Mental Health Prediction
      </h1>
      <p className="text-xs text-cyber-muted mt-1">
        CatBoost Stacking Ensemble (LGBM + XGBoost + ExtraTrees) · SelectKBest Top-20 features · Live predictions from Flask backend
      </p>
    </div>

    {/* Info banner */}
    <div className="glass rounded-xl p-4 border border-cyber-neon/20 flex items-start gap-3">
      <Info className="w-4 h-4 text-cyber-neon mt-0.5 flex-shrink-0" />
      <div className="text-xs text-cyber-muted leading-relaxed">
        <strong className="text-cyber-text">How it works:</strong> The ESP32/NodeMCU sends wrist-sensor data
        (ACC, BVP/IBI, EDA, TEMP) to ThingSpeak. Flask fetches this, extracts 38 physiological features,
        selects the <span className="text-cyber-neon font-mono">Top 20</span> via SelectKBest ANOVA, and passes
        them through our <span className="text-purple-400 font-semibold">CatBoost Stacking Ensemble</span>{' '}
        (LightGBM + XGBoost + ExtraTrees → CatBoost meta-learner). Returns LOW / MEDIUM / HIGH risk
        with confidence score and personalized recommendations.
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <PredictionPanel />
      <div className="space-y-6">
        <RiskHistoryChart height={240} />
        <RecommendationPanel />
      </div>
    </div>
  </div>
);

export default AIPrediction;
