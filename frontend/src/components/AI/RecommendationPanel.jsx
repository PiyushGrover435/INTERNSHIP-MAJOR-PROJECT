import React from 'react';
import { Lightbulb, Heart, Wind, Droplets, Moon, Dumbbell } from 'lucide-react';

const tips = [
  { icon: Wind, title: 'Box Breathing', desc: 'Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 4 times.', color: 'text-cyber-neon' },
  { icon: Droplets, title: 'Hydration', desc: 'Drink 8 glasses of water daily. Dehydration elevates stress hormones.', color: 'text-blue-400' },
  { icon: Moon, title: 'Sleep Hygiene', desc: 'Aim for 7-9 hours. Consistent sleep schedule regulates cortisol.', color: 'text-purple-400' },
  { icon: Dumbbell, title: 'Exercise', desc: '30 minutes of moderate activity daily reduces stress by 30%.', color: 'text-cyber-neonGreen' },
  { icon: Heart, title: 'Mindfulness', desc: '5-10 min of meditation daily improves heart rate variability.', color: 'text-cyber-neonPink' },
  { icon: Lightbulb, title: 'Digital Breaks', desc: 'Take a 5-minute screen break every 45 minutes to reduce eye strain.', color: 'text-yellow-400' },
];

const RecommendationPanel = () => (
  <div className="glass rounded-2xl p-6 neon-border-cyan">
    <div className="flex items-center gap-2 mb-5">
      <Lightbulb className="w-5 h-5 text-yellow-400" />
      <h3 className="font-semibold text-cyber-text">AI Mental Wellness Suggestions</h3>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {tips.map(({ icon: Icon, title, desc, color }, i) => (
        <div key={i} className="glass rounded-xl p-4 border border-cyber-border hover:border-cyber-neon/20 transition-all card-hover">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <span className={`text-sm font-semibold ${color}`}>{title}</span>
          </div>
          <p className="text-xs text-cyber-muted leading-relaxed">{desc}</p>
        </div>
      ))}
    </div>
  </div>
);

export default RecommendationPanel;
