import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App Error Boundary:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          maxWidth: 640,
          margin: '40px auto',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 8,
        }}>
          <h1 style={{ color: '#b91c1c', marginTop: 0 }}>Erreur de l'application</h1>
          <p style={{ color: '#991b1b' }}>{this.state.error.message}</p>
          <pre style={{ overflow: 'auto', fontSize: 12, background: '#fff', padding: 12, border: '1px solid #fecaca' }}>
            {this.state.error.stack}
          </pre>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Ouvre la console du navigateur (F12) pour plus de détails.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ Could not find root element to mount to");
  const newRootElement = document.createElement('div');
  newRootElement.id = 'root';
  document.body.appendChild(newRootElement);
}

const finalRootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(finalRootElement);
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);