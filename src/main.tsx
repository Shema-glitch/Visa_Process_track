import './instrument';
console.log('🚀 main.tsx: Script execution started');
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import App from './App.tsx';
import { ThemeProvider } from './components/theme-provider.tsx';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';
import { Toaster } from '@/components/ui/toast';

console.log('📦 main.tsx: Initializing React root');
const container = document.getElementById('root');
if (!container) {
  console.error('❌ main.tsx: Root container not found!');
}

const root = createRoot(container!, {
  onUncaughtError: (error, errorInfo) => {
    console.error('🔥 Uncaught Error:', error, errorInfo);
    Sentry.reactErrorHandler()(error, errorInfo);
  },
  onCaughtError: (error, errorInfo) => {
    console.warn('⚠️ Caught Error:', error, errorInfo);
    Sentry.reactErrorHandler()(error, errorInfo);
  },
  onRecoverableError: (error, errorInfo) => {
    console.log('🩹 Recoverable Error:', error, errorInfo);
    Sentry.reactErrorHandler()(error, errorInfo);
  },
});

console.log('🚀 main.tsx: Calling root.render');
root.render(
  <ErrorBoundary>
    <AuthProvider>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <App />
        <Toaster />
      </ThemeProvider>
    </AuthProvider>
  </ErrorBoundary>
);
console.log('✅ main.tsx: Render call completed');
