# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project documentation

Architecture docs, ADRs and planned epics live in the sibling repo **`../owl-docs`** (absolute: `/Users/yurii.shevernev/owl-docs`):

- `architecture/` — current system state: `overview.md`, `fs-operation-log.md`, `frontend.md`, `backend.md`, `frontend-ops-log.md`
- `decisions/` — ADRs (numbered, append-only, never edited retroactively)
- `epics/` — planned work broken into tasks; recommended order: 0004 → 0005 → 0006 → 0007

**Key accepted ADRs relevant to frontend:**
- **[0004](../owl-docs/decisions/0004-actions-keyset-pagination.md)** — `GET /drives/{id}/actions` should migrate from `LIMIT`/`OFFSET` to keyset pagination; the current `OFFSET`-based implementation in `RestFilesystemBackend.getActionLog()` and `DriveClient.refreshActionLog()` is transitional.
- **[0005](../owl-docs/decisions/0005-warn-before-overwrite-with-author-and-timestamp.md)** — Before RM/REPLACE: show a warning with the author and timestamp of the version that will be destroyed.
- **[0006](../owl-docs/decisions/0006-batch-overwrite-warnings-aggregation.md)** — Batch RM/REPLACE warnings (aggregated, not per-file).
- **[0007](../owl-docs/decisions/0007-file-properties-card.md)** — File properties card: op log, version history, thumbnails, total size.

## Commands

```bash
npm run dev          # start Vite dev server (web, http://localhost:5173)
npm run build        # TypeScript check + Vite production build → dist/
npm run lint         # ESLint
npm test             # Vitest unit tests (Node)
npm run test:browser # Vitest browser tests (Chrome via WebdriverIO)
npm run tauri        # Tauri desktop dev (requires Rust)
npx tsc --noEmit     # type-check only, no output
```

Run a single test file: `npm test -- src/engine/service/test/fs-state.test.ts`

## Environment / Runtime Config

Runtime URLs live in **`public/env.js`** (sets `window.APP_*` globals). This file is **never committed** — it contains local server addresses and is `.gitignore`-style sensitive. All other env vars go through Vite's `VITE_` prefix.

## Architecture

### Backend layer stack (outermost → innermost)

```
PreloadingFilesystemBackend   – pre-fetches ops to eliminate latency
  └─ CachingFilesystemBackend – IndexedDB/Cache API caching for ops+data
       └─ RestFilesystemBackend – HTTP calls to the Owload API
```

All three implement `FilesystemBackend` (`src/engine/backend/filesystem-backend.ts`). When adding a new abstract method, implement it in all three classes — `CachingFilesystemBackend` and `PreloadingFilesystemBackend` mostly delegate to their inner backend.

Key backend methods:
- `getOperations(driveId, startBytePos)` → raw encrypted op bytes
- `saveOperation / startUploadSession / finishUploadSession / saveDataBlock / getDataBlock / deleteDataRange`
- `getActionLog(driveId, limit, offset)` → `GET /drives/{driveId}/actions?limit=&offset=` (newest-first, offset=0 is the most recent)

### Operations pipeline (innermost → outermost)

```
EncryptingOpsRepository    – AES-CTR encrypt/decrypt raw op bytes
  └─ SplittingOpsRepository – splits byte stream by OPS_SEPARATOR [195, 184, 234]
       └─ SerializingOpsRepository – serializes FsOperation ↔ JSON
            └─ HashValidatingOpsRepository – verifies chain hash + RSA signature
```

Each op is stored as `[SEP][opBytes][SEP]`. The backend logs `start` at the leading separator byte; the client's `startBytePos` (in `FsOperationWrapper`) is 3 bytes after → `actionLog.attributes.start + OPS_SEPARATOR_BYTE_LENGTH === op.startBytePos`.

### DriveClient (`src/engine/service/drive-client.ts`)

The main per-drive service object. Holds:
- `fsState: FsState` — current in-memory filesystem tree (rebuilt from all ops)
- `actionLog: DriveActionLogEntry[]` — cached server action log
- `operationLog: FsOperationWrapper[]` — all parsed ops in order
- `path` — current browse path

`refresh()` loads ops incrementally using a snapshot cache (`FS_SNAPSHOT_CACHE`). `refreshActionLog()` fetches newest-first from offset=0, stops when it hits a known ID, and prepends new entries to the cache.

### FsState (`src/engine/service/fs-state.ts`)

Replay engine for the filesystem tree. `performOp(op, mode)` applies a single `FsOperation` — call with `PerformOpMode.VALIDATE_ONLY` first, then `DO_PERFORM`.

Node conflict modes (`FsOperationNameConflictMode`):
- `REPLACE` — detach existing node at destination if present
- `RENAME` — auto-generate unique name (`generateUniqueName`)
- `FIXED` — use explicit `destFileNames[i]`

Upload supports only REPLACE and RENAME. MV/CP support all three.

Node ID (`createdOpHash`) = `await op.hashCode()` of the `UploadStartFsOperation` that created the file. This is used as the nodeId throughout the tree.

### Zustand store (`src/stores/files-store.ts`)

Single global store composed from slices: `KeysSlice`, `DrivesSlice`, `FilesSlice`, `UploadSlice`, `FsOpsDialogSlice`, `MediaPreviewSlice`, `CopyPasteSlice`. Only `driveKeys` and `driveStats` are persisted to localStorage (`owload_fstorage`). The store syncs across browser tabs via the `storage` event.

`driveClient` lives in `FilesSlice` and is the primary way components interact with a drive.

### System (thumbnail) files

Files with names starting with `SYSTEM_PREFIX = "$$$sy$s$stem!_"` are internal. Thumbnail format: `SYSTEM_PREFIX + "thumb_" + size + "_" + fileId.replaceAll("/", "$")`. The `fileId` encodes the nodeId (upload op hash) of the original file with `/` replaced by `$`. Path symbol replacement constant: `PATH_SYMBOL_REAPLACEMENT = "$"` (note the typo — keep it consistent).

Defined in `src/hooks/use-files-store-ops.ts`; imported by `drive-logs.tsx`.

### Drive logs (`src/components/drive-logs/drive-logs.tsx`)

Debug UI showing two tabs: **FS operations** (default) and **Action log**. Key data flows:
- `enrichedOps` — merges `FsOperationWrapper[]` with action log `SAVE_OP` entries by byte offset
- `uploadStartHashMap` — async map of `hash → startBytePos` for all START_UPLOAD ops (needed to group START+FINISH pairs)
- `overwriteSet` — replays a fresh `FsState` sequentially to detect REPLACE ops that actually overwrote an existing file
- `nodeIdToPath` — inverts `uploadStartHashMap` to resolve thumbnail nodeIds → original file paths for deleted files
