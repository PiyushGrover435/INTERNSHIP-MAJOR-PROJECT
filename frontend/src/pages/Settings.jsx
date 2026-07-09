import React, { useState, useEffect } from 'react';
import { Save, Phone } from 'lucide-react';

const Settings = () => {
  const [caregiver1, setCaregiver1] = useState('');
  const [caregiver2, setCaregiver2] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load from localStorage on mount
    const cg1 = localStorage.getItem('caregiver1') || '+919999999999';
    const cg2 = localStorage.getItem('caregiver2') || '+918888888888';
    setCaregiver1(cg1);
    setCaregiver2(cg2);
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('caregiver1', caregiver1);
    localStorage.setItem('caregiver2', caregiver2);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-cyber-text">System Settings</h1>
        <p className="text-xs text-cyber-muted font-mono mt-1">Configure personalized emergency contacts</p>
      </div>

      <div className="glass-strong rounded-2xl p-6 border border-cyber-border max-w-2xl">
        <h2 className="text-lg font-semibold text-cyber-neon flex items-center gap-2 mb-6">
          <Phone className="w-5 h-5" />
          Emergency Caregiver Contacts
        </h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-cyber-muted mb-2">Caregiver 1 Number</label>
            <input
              type="tel"
              value={caregiver1}
              onChange={(e) => setCaregiver1(e.target.value)}
              placeholder="+91..."
              className="w-full bg-black/40 border border-cyber-border rounded-xl px-4 py-3 text-cyber-text focus:outline-none focus:border-cyber-neon/50 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-cyber-muted mb-2">Caregiver 2 Number</label>
            <input
              type="tel"
              value={caregiver2}
              onChange={(e) => setCaregiver2(e.target.value)}
              placeholder="+91..."
              className="w-full bg-black/40 border border-cyber-border rounded-xl px-4 py-3 text-cyber-text focus:outline-none focus:border-cyber-neon/50 transition-colors"
            />
          </div>

          <div className="flex items-center gap-4 pt-2">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-cyber-neon/20 border border-cyber-neon/40 text-cyber-neon font-semibold flex items-center gap-2 hover:bg-cyber-neon/30 transition-all"
            >
              <Save className="w-4 h-4" />
              Save Contacts
            </button>
            
            {saved && (
              <span className="text-cyber-neonGreen text-sm animate-pulse flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-cyber-neonGreen" />
                Settings Saved Successfully!
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
