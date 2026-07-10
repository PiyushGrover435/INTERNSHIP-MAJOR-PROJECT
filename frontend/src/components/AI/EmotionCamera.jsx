import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { Camera, AlertTriangle, Loader } from 'lucide-react';

const EMOTION_COLORS = {
  happy: 'text-cyber-neonGreen',
  neutral: 'text-cyber-neon',
  sad: 'text-blue-400',
  angry: 'text-cyber-danger',
  fearful: 'text-orange-400',
  surprised: 'text-yellow-400',
  disgusted: 'text-purple-400',
};

const EMOTION_ICONS = {
  happy: '😊', neutral: '😐', sad: '😢',
  angry: '😡', fearful: '😨', surprised: '😲', disgusted: '🤢',
};

const EmotionCamera = ({ onEmotionDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const intervalRef = useRef(null);
  const currentEmotionRef = useRef('neutral');
  const targetEmotionRef = useRef(null);
  const consecutiveCountRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const [emotion, setEmotion] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState('');
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        setIsLoading(false);
      } catch (e) {
        setError('Failed to load AI models. Check your internet connection.');
        setIsLoading(false);
      }
    };
    loadModels();
    return () => {
      clearInterval(intervalRef.current);
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setIsActive(true);
      setError('');
      startDetection();
    } catch (e) {
      setError('Camera access denied. Please allow camera permissions.');
    }
  };

  const stopCamera = () => {
    clearInterval(intervalRef.current);
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    currentEmotionRef.current = 'neutral';
    targetEmotionRef.current = null;
    consecutiveCountRef.current = 0;
    setIsActive(false);
    setEmotion(null);
  };

  const performDetection = async () => {
      if (!videoRef.current || !canvasRef.current || !modelsLoaded || videoRef.current.videoWidth === 0 || videoRef.current.readyState < 2) {
          return;
      }
      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
          .withFaceExpressions();

        if (detections.length > 0) {
          const exprs = detections[0].expressions;
          const sorted = Object.entries(exprs).sort((a, b) => b[1] - a[1]);
          let topEmotionName = sorted[0][0];
          let topEmotionScore = sorted[0][1];

          if (topEmotionScore < 0.3 && topEmotionName !== 'neutral') {
            topEmotionName = 'neutral';
            topEmotionScore = 0.5; 
          }

          // Anti-Flicker Hysteresis Algorithm (Requires 4 consecutive identical frames to change state)
          if (topEmotionName === currentEmotionRef.current) {
              // Same emotion as currently displayed, reset counters and just update confidence smoothly
              consecutiveCountRef.current = 0;
              targetEmotionRef.current = null;
              setEmotion(currentEmotionRef.current);
              setConfidence(Math.round(topEmotionScore * 100));
          } else {
              // A different emotion was detected
              if (topEmotionName === targetEmotionRef.current) {
                  // It's the same as the pending new emotion, increment counter
                  consecutiveCountRef.current += 1;
                  if (consecutiveCountRef.current >= 4) {
                      // It has been consistently this new emotion for 4 frames (~2 seconds). Accept it!
                      currentEmotionRef.current = topEmotionName;
                      consecutiveCountRef.current = 0;
                      setEmotion(topEmotionName);
                      setConfidence(Math.round(topEmotionScore * 100));
                      if (onEmotionDetected) onEmotionDetected(topEmotionName, Math.round(topEmotionScore * 100));
                  }
              } else {
                  // A brand new emotion just appeared, start counting it
                  targetEmotionRef.current = topEmotionName;
                  consecutiveCountRef.current = 1;
              }
          }
        }
      } catch (e) {
          console.error("[EmotionCamera] Detection Error:", e);
      }
  };

  const startDetection = () => {
    setTimeout(performDetection, 100); 
    intervalRef.current = setInterval(performDetection, 500);
  };

  return (
    <div className="glass rounded-2xl border border-cyber-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyber-neon" />
          <h3 className="text-sm font-semibold text-cyber-text">Facial Emotion Recognition</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">AI Powered</span>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyber-danger animate-pulse" />
            <span className="text-[10px] text-cyber-danger font-mono">LIVE</span>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-red-900/20 border border-cyber-danger/30 text-xs text-cyber-danger">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="relative rounded-xl overflow-hidden bg-[#0a0a0a] border border-cyber-border" style={{ height: 200 }}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {!isActive && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <Camera className="w-8 h-8 text-cyber-muted opacity-40" />
            <p className="text-xs text-cyber-muted">Camera inactive</p>
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60">
            <Loader className="w-6 h-6 text-cyber-neon animate-spin" />
            <p className="text-xs text-cyber-muted">Loading AI models...</p>
          </div>
        )}
      </div>

      {emotion && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-cyber-surface border border-cyber-border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{EMOTION_ICONS[emotion] || '😐'}</span>
            <div>
              <p className={`font-bold capitalize text-sm ${EMOTION_COLORS[emotion] || 'text-cyber-neon'}`}>{emotion}</p>
              <p className="text-[10px] text-cyber-muted font-mono">{confidence}% confidence</p>
            </div>
          </div>
          <div className="w-16 bg-cyber-surface rounded-full h-2 border border-cyber-border overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${confidence}%`, backgroundColor: emotion === 'angry' || emotion === 'fearful' ? '#ff3d71' : '#00f5ff' }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={isActive ? stopCamera : startCamera}
          disabled={isLoading || !modelsLoaded}
          className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2
            ${isActive
              ? 'bg-cyber-danger/20 border border-cyber-danger/40 text-cyber-danger hover:bg-cyber-danger/30'
              : 'bg-cyber-neon/10 border border-cyber-neon/30 text-cyber-neon hover:bg-cyber-neon/20'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Camera className="w-3 h-3" />
          {isLoading ? 'Loading...' : isActive ? 'Stop Camera' : 'Start Camera'}
        </button>
      </div>
    </div>
  );
};

export default EmotionCamera;
