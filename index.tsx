import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './src/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ Could not find root element to mount to");
  // Créer l'élément root s'il n'existe pas
  const newRootElement = document.createElement('div');
  newRootElement.id = 'root';
  document.body.appendChild(newRootElement);
  console.log("✅ Root element créé automatiquement");
}

const finalRootElement = document.getElementById('root')!;
const root = ReactDOM.createRoot(finalRootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);