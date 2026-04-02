import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.tsx'
import { AuthContextProvider } from './auth-context-provider.tsx'
import { installServiceWorker } from './install-sw.ts';
import { Landing } from './landing/Landing.tsx';

installServiceWorker();

createRoot(document.getElementById('root')!).render(
  <AuthContextProvider
    authenticatedChild={<App />}
    anonymousChild={<Landing />} />
);