import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Save, Phone, Lock, ShieldCheck, AlertTriangle } from 'lucide-react';

const Settings = () => {
  const { user, isLoaded } = useUser();

  const [caregiver1, setCaregiver1] = useState('');
  const [caregiver2, setCaregiver2] = useState('');
  const [saved, setSaved] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load numbers from Clerk user metadata (persisted to account)
  useEffect(() => {
    if (!isLoaded || !user) return;

    const meta = user.unsafeMetadata || {};
    if (meta.caregiver1) {
      setCaregiver1(meta.caregiver1);
      // Sync to localStorage so EmergencyPopup can read them
      localStorage.setItem('caregiver1', meta.caregiver1);
    } else {
      // Fallback: read from localStorage for first-time users
      setCaregiver1(localStorage.getItem('caregiver1') || '');
    }

    if (meta.caregiver2) {
      setCaregiver2(meta.caregiver2);
      localStorage.setItem('caregiver2', meta.caregiver2);
    } else {
      setCaregiver2(localStorage.getItem('caregiver2') || '');
    }

    // Lock if numbers are already saved to account
    setIsLocked(!!(meta.caregiver1 || meta.caregiver2));
  }, [isLoaded, user]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!caregiver1) { setError('Caregiver 1 number is required.'); return; }

    setSaving(true);
    setError('');

    try {
      // Save to Clerk user account metadata — tied permanently to this account
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          caregiver1,
          caregiver2,
        },
      });

      // Also sync to localStorage for immediate use
      localStorage.setItem('caregiver1', caregiver1);
      localStorage.setItem('caregiver2', caregiver2);

      setSaved(true);
      setIsLocked(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err) {
      setError('Failed to save. Please check your connection and try again.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-cyber-muted animate-pulse">Loading account...</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-cyber-text">System Settings</h1>
        <p className="text-xs text-cyber-muted font-mono mt-1">
          Emergency contacts are saved securely to your account
        </p>
      </div>

      <div className="glass-strong rounded-2xl p-6 border border-cyber-border max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-cyber-neon flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Emergency Caregiver Contacts
          </h2>
          {isLocked && (
            <div className="flex items-center gap-1.5 text-xs text-cyber-neonGreen bg-cyber-neonGreen/10 border border-cyber-neonGreen/30 px-3 py-1 rounded-full">
              <ShieldCheck className="w-3 h-3" />
              Saved to Account
            </div>
          )}
        </div>

        {/* Account-lock notice */}
        {isLocked && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-900/20 border border-yellow-500/30">
            <Lock className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">Contacts are locked to your account</p>
              <p className="text-xs text-yellow-400/70 mt-1">
                These numbers are saved to your Clerk account and will sync across all devices.
                Click "Edit Contacts" below to update them.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-cyber-danger/30 text-xs text-cyber-danger">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-cyber-muted mb-2">
              Caregiver 1 (Primary) <span className="text-cyber-danger">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                value={caregiver1}
                onChange={(e) => setCaregiver1(e.target.value)}
                placeholder="+919999999999"
                disabled={isLocked}
                className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-cyber-text 
                  focus:outline-none transition-colors
                  ${isLocked
                    ? 'border-cyber-border/30 text-cyber-muted cursor-not-allowed opacity-60'
                    : 'border-cyber-border focus:border-cyber-neon/50'
                  }`}
                required
              />
              {isLocked && <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted/40" />}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-cyber-muted mb-2">
              Caregiver 2 (Secondary)
            </label>
            <div className="relative">
              <input
                type="tel"
                value={caregiver2}
                onChange={(e) => setCaregiver2(e.target.value)}
                placeholder="+918888888888"
                disabled={isLocked}
                className={`w-full bg-black/40 border rounded-xl px-4 py-3 text-cyber-text 
                  focus:outline-none transition-colors
                  ${isLocked
                    ? 'border-cyber-border/30 text-cyber-muted cursor-not-allowed opacity-60'
                    : 'border-cyber-border focus:border-cyber-neon/50'
                  }`}
              />
              {isLocked && <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyber-muted/40" />}
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            {isLocked ? (
              <button
                type="button"
                onClick={() => setIsLocked(false)}
                className="px-6 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/40 text-yellow-400 font-semibold flex items-center gap-2 hover:bg-yellow-500/20 transition-all"
              >
                <Lock className="w-4 h-4" />
                Edit Contacts
              </button>
            ) : (
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl bg-cyber-neon/20 border border-cyber-neon/40 text-cyber-neon font-semibold flex items-center gap-2 hover:bg-cyber-neon/30 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving to Account...' : 'Save to Account'}
              </button>
            )}

            {saved && (
              <span className="text-cyber-neonGreen text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Saved to your account permanently!
              </span>
            )}
          </div>
        </form>

        <div className="pt-2 border-t border-cyber-border">
          <p className="text-[11px] text-cyber-muted leading-relaxed">
            <span className="text-cyber-neon font-mono">Note:</span> These contacts are stored in your Clerk account metadata.
            They are automatically used for emergency SMS and WhatsApp alerts when a HIGH risk is detected.
            They sync to all devices where you log in with this account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
