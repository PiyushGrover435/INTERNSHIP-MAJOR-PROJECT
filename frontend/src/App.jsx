import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/AppContext';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import AppFooter from './components/Layout/AppFooter';
import NotificationPanel from './components/Notifications/NotificationPanel';
import EmergencyPopup from './components/Notifications/EmergencyPopup';

import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import AIPrediction from './pages/AIPrediction';
import AlertHistory from './pages/AlertHistory';
import About from './pages/About';
import Settings from './pages/Settings';
import EEGSimulator from './pages/EEGSimulator';
import PatientBehaviour from './pages/PatientBehaviour';
import VoiceAssistant from './components/Assistant/VoiceAssistant';

const Layout = ({ children }) => (
  <div className="flex h-screen overflow-hidden bg-cyber-bg grid-bg">
    <Sidebar />
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <AppFooter />
    </div>
  </div>
);

// ConnectedVoiceAssistant reads from AppContext and passes props to VoiceAssistant
const ConnectedVoiceAssistant = () => {
  const { hallucinationData } = useApp();
  return (
    <VoiceAssistant
      hallucinationRisk={hallucinationData.hallucination_risk}
      hallucinationLevel={hallucinationData.hallucination_level}
      voiceMessage={hallucinationData.voice_message}
      voiceTrigger={hallucinationData.voice_trigger}
    />
  );
};

const App = () => (
  <BrowserRouter>
    <AppProvider>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-[#111111] grid-bg py-10">
          <SignUp routing="hash" />
        </div>
      </SignedOut>
      <SignedIn>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/ai-prediction" element={<AIPrediction />} />
            <Route path="/eeg-simulator" element={<EEGSimulator />} />
            <Route path="/patient-behaviour" element={<PatientBehaviour />} />
            <Route path="/alert-history" element={<AlertHistory />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
        <NotificationPanel />
        <EmergencyPopup />
        <ConnectedVoiceAssistant />
      </SignedIn>
    </AppProvider>
  </BrowserRouter>
);

export default App;
