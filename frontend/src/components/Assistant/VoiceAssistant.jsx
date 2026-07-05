import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Brain, X, Zap } from 'lucide-react';

const RESPONSES = {
  greet: "Hello! I am your NeuroWatch assistant. I am here to help you manage stress and stay healthy.",
  music: "Of course! Opening a calming music playlist for you right now. Just relax and breathe.",
  breathe: "Let us do a simple breathing exercise together. Breathe in slowly for 4 counts... hold for 4... and breathe out for 6. Let us begin.",
  lonely: "I hear you. You are not alone. I am always here with you. Would you like to listen to some music or talk for a bit?",
  calm: "You are doing great. Close your eyes for a moment, take a slow breath, and remember that this feeling will pass.",
  stop: "Understood. I am here whenever you need me. Take care.",
  unknown: "I am here for you. You can say things like: play music, breathing exercise, or I feel lonely.",
};

const VoiceAssistant = ({ hallucinationRisk, hallucinationLevel, voiceMessage, voiceTrigger }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [assistantText, setAssistantText] = useState('');
  const [autoTriggered, setAutoTriggered] = useState(false);
  const [musicUrl, setMusicUrl] = useState(null);
  // Key fix: track whether user has "unlocked" audio by clicking once
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [showUnlockBanner, setShowUnlockBanner] = useState(true);

  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const lastRiskRef = useRef(null);
  const pendingSpeechRef = useRef(null);

  // ── Unlock audio context with a user gesture ────────────────────
  const unlockAudio = useCallback(() => {
    // Speak a silent utterance to unlock the browser audio context
    const unlock = new SpeechSynthesisUtterance('');
    unlock.volume = 0;
    window.speechSynthesis.speak(unlock);
    setAudioUnlocked(true);
    setShowUnlockBanner(false);

    // If there was a pending auto-speech, trigger it now
    if (pendingSpeechRef.current) {
      const msg = pendingSpeechRef.current;
      pendingSpeechRef.current = null;
      setTimeout(() => speak(msg), 300);
    }
  }, []); // eslint-disable-line

  // ── Text-to-Speech ──────────────────────────────────────────────
  const speak = useCallback((text) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // Prefer a calm female voice if available
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v =>
      v.name.toLowerCase().includes('female') ||
      v.name.toLowerCase().includes('samantha') ||
      v.name.toLowerCase().includes('victoria') ||
      v.name.toLowerCase().includes('google uk english female')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setAssistantText(text);
    synthRef.current.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
  }, []);

  // ── Auto-Trigger when hallucination risk is HIGH/CRITICAL ────────
  useEffect(() => {
    if (
      voiceTrigger &&
      voiceMessage &&
      (hallucinationLevel === 'HIGH' || hallucinationLevel === 'CRITICAL') &&
      lastRiskRef.current !== hallucinationLevel
    ) {
      lastRiskRef.current = hallucinationLevel;
      setAutoTriggered(true);
      setIsOpen(true); // Always open the panel

      if (audioUnlocked) {
        // Audio is unlocked — speak immediately
        setTimeout(() => speak(voiceMessage), 600);
      } else {
        // Audio not unlocked yet — save for when user clicks unlock
        pendingSpeechRef.current = voiceMessage;
        setAssistantText(voiceMessage); // Show text at least
      }
    }
  }, [voiceTrigger, voiceMessage, hallucinationLevel, audioUnlocked, speak]);

  // ── Speech Recognition ─────────────────────────────────────────
  const startListening = useCallback(() => {
    if (!audioUnlocked) { unlockAudio(); }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speak("Speech recognition is not supported in this browser. Please try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event) => {
      const said = event.results[0][0].transcript.toLowerCase();
      setTranscript(said);

      if (said.includes('music') || said.includes('song') || said.includes('playlist')) {
        speak(RESPONSES.music);
        setMusicUrl('https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u');
      } else if (said.includes('breath') || said.includes('exercise')) {
        speak(RESPONSES.breathe);
      } else if (said.includes('lonely') || said.includes('alone') || said.includes('sad')) {
        speak(RESPONSES.lonely);
      } else if (said.includes('calm') || said.includes('stress') || said.includes('anxiety')) {
        speak(RESPONSES.calm);
      } else if (said.includes('stop') || said.includes('quit') || said.includes('bye')) {
        speak(RESPONSES.stop);
        setTimeout(() => setIsOpen(false), 3000);
      } else if (said.includes('hello') || said.includes('hi') || said.includes('hey')) {
        speak(RESPONSES.greet);
      } else {
        speak(RESPONSES.unknown);
      }
    };

    recognition.start();
  }, [audioUnlocked, unlockAudio, speak]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  // Risk color
  const riskColor = {
    CRITICAL: 'border-red-500 shadow-red-500/30',
    HIGH: 'border-orange-500 shadow-orange-500/30',
    MEDIUM: 'border-yellow-500 shadow-yellow-500/30',
    LOW: 'border-cyber-neon shadow-cyber-neon/20',
  }[hallucinationLevel] || 'border-cyber-neon shadow-cyber-neon/20';

  return (
    <>
      {/* One-time Audio Unlock Banner */}
      {showUnlockBanner && (
        <div className="fixed bottom-36 right-5 z-50 w-72 animate-fade-in">
          <button
            onClick={unlockAudio}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl
              bg-cyber-neon/10 border border-cyber-neon/40 text-cyber-neon
              hover:bg-cyber-neon/20 transition-all text-sm font-medium shadow-lg"
          >
            <Zap className="w-4 h-4 flex-shrink-0" />
            <span>Click to Enable Auto-Voice 🔊</span>
          </button>
        </div>
      )}

      {/* Floating Brain Button */}
      <button
        onClick={() => { setIsOpen(o => !o); if (!audioUnlocked) unlockAudio(); }}
        className={`fixed bottom-20 right-5 z-50 w-12 h-12 rounded-full flex items-center justify-center
          glass-strong border-2 transition-all duration-300 shadow-lg
          ${autoTriggered && !isOpen ? 'animate-pulse border-red-500' : riskColor}
          hover:scale-110`}
        title="NeuroWatch Voice Assistant"
      >
        <Brain className="w-5 h-5 text-cyber-neon" />
        {(hallucinationLevel === 'HIGH' || hallucinationLevel === 'CRITICAL') && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 animate-ping" />
        )}
      </button>

      {/* Assistant Panel */}
      {isOpen && (
        <div className={`fixed bottom-36 right-5 z-50 w-80 glass-strong rounded-2xl border-2 ${riskColor}
          shadow-[0_8px_40px_rgba(0,0,0,0.7)] animate-fade-in`}>

          {/* Header */}
          <div className="p-4 border-b border-cyber-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-cyber-neon animate-pulse' : 'bg-gray-500'}`} />
              <span className="text-sm font-semibold text-cyber-text">NeuroWatch Assistant</span>
              {audioUnlocked && (
                <span className="text-[10px] text-cyber-neon bg-cyber-neon/10 px-1.5 py-0.5 rounded-full">LIVE</span>
              )}
            </div>
            <button onClick={() => { setIsOpen(false); stopSpeaking(); }}
              className="text-cyber-muted hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Audio Unlock Inside Panel */}
          {!audioUnlocked && (
            <div className="px-4 pt-3">
              <button onClick={unlockAudio}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl
                  bg-cyber-neon/15 border border-cyber-neon/40 text-cyber-neon text-xs
                  hover:bg-cyber-neon/25 transition-all font-medium">
                <Zap className="w-3 h-3" />
                Tap to Enable Auto-Speech
              </button>
            </div>
          )}

          {/* Risk Badge */}
          {hallucinationRisk > 0 && (
            <div className="px-4 pt-3">
              <div className={`text-xs font-mono px-3 py-1.5 rounded-full inline-flex items-center gap-2
                ${hallucinationLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : hallucinationLevel === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'}`}>
                <Brain className="w-3 h-3" />
                Hallucination Risk: {hallucinationRisk}% — {hallucinationLevel}
              </div>
            </div>
          )}

          {/* Assistant Message */}
          <div className="p-4 min-h-[80px]">
            {assistantText ? (
              <p className="text-sm text-cyber-text leading-relaxed">
                {isSpeaking && <span className="inline-block w-2 h-2 bg-cyber-neon rounded-full animate-pulse mr-2" />}
                {assistantText}
              </p>
            ) : (
              <p className="text-sm text-cyber-muted italic">
                Press the mic and say something — try "play music" or "breathing exercise"
              </p>
            )}
          </div>

          {/* Transcript */}
          {transcript && (
            <div className="px-4 pb-2">
              <p className="text-[11px] text-cyber-muted font-mono">You said: "{transcript}"</p>
            </div>
          )}

          {/* Music Link */}
          {musicUrl && (
            <div className="px-4 pb-3">
              <a href={musicUrl} target="_blank" rel="noopener noreferrer"
                className="text-xs text-cyber-neon hover:text-cyber-neonPurple underline transition-colors">
                🎵 Open Calming Playlist →
              </a>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-t border-cyber-border flex items-center justify-between gap-3">
            <button
              onMouseDown={startListening}
              onMouseUp={stopListening}
              onTouchStart={startListening}
              onTouchEnd={stopListening}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium transition-all
                ${isListening
                  ? 'bg-red-500/20 border border-red-500 text-red-400 animate-pulse'
                  : 'bg-cyber-neon/10 border border-cyber-neon/30 text-cyber-neon hover:bg-cyber-neon/20'}`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isListening ? 'Listening...' : 'Hold to Speak'}
            </button>

            <button
              onClick={isSpeaking ? stopSpeaking : () => { if (!audioUnlocked) unlockAudio(); speak(RESPONSES.greet); }}
              className="p-2 rounded-xl glass border border-cyber-border text-cyber-muted hover:text-cyber-neon transition-all"
              title={isSpeaking ? 'Stop' : 'Greet'}
            >
              {isSpeaking ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default VoiceAssistant;
