# Owload

Secure cloud storage with client-side encryption. Files are encrypted on your device before upload — the server never sees plaintext data or your encryption keys.

## Features

- **Client-side encryption** — AES-256-CTR encryption happens in the browser/app before any data leaves your machine
- **Password-based keys** — symmetric keys are derived from your drive password via PBKDF2 (SHA-512, 100k iterations) and never transmitted to the server
- **Desktop app** — Tauri-based native app for macOS, Windows, Linux (recommended for maximum security)
- **Web app** — browser-based access via Keycloak authentication
- **Encrypted metadata** — file paths and operation types are encrypted alongside file contents

## Security model

Plaintext data and symmetric keys never leave the client. A compromised server can read only encrypted ciphertext.

- **Key derivation**: drive password → PBKDF2-SHA-512 (100k iterations) → `K_master`; HKDF-SHA-256 derives independent stream keys for ops log, file data, and caches
- **Encryption**: AES-256-CTR per stream; keystream uniqueness is guaranteed per stream by HKDF, not by counter alone
- **File integrity**: SHA-256 of plaintext computed on upload, verified on download; mismatch throws before the file is returned to the caller
- **Ops log integrity**: hash chain (`previousOperationHash`) embedded in each operation; tampering with any intermediate op breaks all subsequent chain entries

## Requirements

- Node.js ≥ 18
- npm ≥ 9
- Rust ≥ 1.77.2 (for desktop build only)
- Keycloak server configured as the identity provider
- Owload backend API

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and fill in your server URLs:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_APP_KEYCLOAK_URL` | Keycloak base URL |
| `VITE_APP_KEYCLOAK_REALM` | Keycloak realm name |
| `VITE_APP_KEYCLOAK_CLIENT_ID` | Keycloak client ID |
| `VITE_APP_MAIN_BACKEND_URL` | Owload backend API base URL |

## Running

### Web (development)

```bash
npm run dev
```

Opens at `http://localhost:5173`. Authentication via Keycloak redirect flow.

### Desktop (development)

```bash
npm run tauri
```

Launches the Tauri desktop app with hot reload. Authentication via ROPC (username/password form).

### Web (production build)

```bash
npm run build
```

Output in `dist/`.

### Desktop (production build)

```bash
npm run tauri:build
```

Produces platform-specific installers in `src-tauri/target/release/bundle/`.

## Testing

```bash
# Unit tests
npm test

# Browser-based tests
npm run test:browser
```

## Tech stack

- **Frontend** — React 19, TypeScript, Tailwind CSS, shadcn/ui, Zustand, React Router
- **Encryption** — Web Crypto API (AES-256-CTR, PBKDF2-SHA-512, HKDF-SHA-256)
- **Desktop** — Tauri 2
- **Auth** — Keycloak (OIDC)
