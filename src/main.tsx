import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.tsx'
import { AuthContextProvider, IS_TAURI } from './auth-context-provider.tsx'
import { LoginForm } from './components/login/login-form.tsx'
import { Landing } from './landing/Landing.tsx'
import { installServiceWorker } from './install-sw.ts'

installServiceWorker();

createRoot(document.getElementById('root')!).render(
  <AuthContextProvider
    authenticatedChild={<App />}
    anonymousChild={IS_TAURI ? <LoginForm /> : <Landing />} />
);