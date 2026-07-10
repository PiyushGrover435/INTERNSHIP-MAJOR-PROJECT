import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { registerServiceWorker, requestNotificationPermission } from './api/notifications.js';

// Boot: Register SW + Request notification permission
registerServiceWorker();
requestNotificationPermission();

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

let AppRoot;
if (!PUBLISHABLE_KEY) {
  AppRoot = () => (
    <div style={{ padding: '20px', color: 'red', fontFamily: 'sans-serif' }}>
      <h2>Clerk API Key Missing</h2>
      <p>VITE_CLERK_PUBLISHABLE_KEY is not defined in .env</p>
    </div>
  );
} else {
  AppRoot = () => (
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY}
      appearance={{ baseTheme: dark }}
    >
      <App />
    </ClerkProvider>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', fontFamily: 'monospace' }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AppRoot />
    </ErrorBoundary>
  </React.StrictMode>,
)
