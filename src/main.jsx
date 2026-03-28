import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register service worker for PWA + push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('SW registered:', reg.scope);
        // Listen for background timer check messages
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'CHECK_TIMERS') {
            // Trigger a re-check from any open page
            window.dispatchEvent(new Event('sw-check-timers'));
          }
        });
      })
      .catch(err => console.warn('SW registration failed:', err));
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
