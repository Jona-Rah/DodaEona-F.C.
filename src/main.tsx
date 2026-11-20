import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register PWA service worker with automatic updates and caching
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info('DodaEona F.C. has a new version available.');
  },
  onOfflineReady() {
    console.info('DodaEona F.C. is ready for offline standalone usage.');
  },
});

// Google Maps Platform client-side quota listener and console tap
if (typeof window !== 'undefined') {
  (window as any).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
  };
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    origConsoleError.apply(console, args);
    const msg = args.map((a) => String(a)).join(' ');
    if (
      msg.includes('OverQuotaMapError') ||
      (msg.includes('Google Maps') && msg.includes('Quota'))
    ) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
    }
  };
}

createRoot(document.getElementById('root')!).render(<App />);

