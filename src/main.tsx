import { createRoot } from 'react-dom/client'
import './index.css'

import App from './App.tsx'
import { AuthContextProvider, IS_TAURI } from './auth-context-provider.tsx'
import { LoginForm } from './components/login/login-form.tsx'
import { Landing } from './landing/Landing.tsx'
import { installServiceWorker } from './install-sw.ts'
import { PublicApp, publicTokenOfThisPage } from './public/public-app.tsx'

installServiceWorker();

// The link of a public drive opens it for anyone, with no sign-in.
const publicToken = publicTokenOfThisPage();

createRoot(document.getElementById('root')!).render(
  publicToken
    ? <PublicApp token={publicToken} />
    : <AuthContextProvider
        authenticatedChild={<App />}
        anonymousChild={IS_TAURI ? <LoginForm /> : <Landing />} />
);