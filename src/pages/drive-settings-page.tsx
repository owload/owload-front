import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TargetConfig, TargetPicker, buildTargetInput, emptyTarget, isCustomValid, isTargetReady } from "@/components/storage/target-picker";
import { DriveStorageTarget, RestDriveBackend, S3Preset } from "@/engine";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

type HealthState = 'loading' | 'ok' | 'error';
interface HealthResult { state: HealthState; error?: string }

function targetLabel(t: DriveStorageTarget): string {
  if (t.presetLabel) return t.presetLabel;
  if (t.customEndpointUrl) return `Custom (${t.customBucket ?? t.customEndpointUrl})`;
  return 'Custom';
}

function tierBadge(tier: DriveStorageTarget['tier']) {
  return tier === 'cold'
    ? <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">cold</span>
    : <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">hot</span>;
}

function statusBadge(status: DriveStorageTarget['status']) {
  if (status === 'PROVISIONING') return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">backfill in progress</span>;
  if (status === 'REMOVING') return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">removing</span>;
  return null;
}

function healthBadge(h: HealthResult | undefined) {
  if (!h || h.state === 'loading') return <span className="text-xs text-muted-foreground">⏳ checking…</span>;
  if (h.state === 'ok') return <span className="text-xs text-green-600 font-medium">✓ Connected</span>;
  return <span className="text-xs text-red-500">✗ {h.error ?? 'Connection failed'}</span>;
}

function makeMasterDisabledReason(t: DriveStorageTarget): string | null {
  if (t.role === 'MASTER') return 'Already master';
  if (t.status === 'PROVISIONING') return 'Not ready (backfill in progress)';
  if (t.status === 'REMOVING') return 'Being removed';
  if (t.tier === 'cold') return 'Cold tier cannot be master';
  return null;
}

export function DriveSettingsPage() {
  const { driveId } = useParams<{ driveId: string }>();

  const [targets, setTargets] = useState<DriveStorageTarget[]>([]);
  const [health, setHealth] = useState<Record<string, HealthResult>>({});
  const [allPresets, setAllPresets] = useState<S3Preset[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DriveStorageTarget | null>(null);
  const [showAddSlave, setShowAddSlave] = useState(false);
  const [newSlave, setNewSlave] = useState<TargetConfig>(emptyTarget());

  const driveBackend = new RestDriveBackend();

  async function load() {
    if (!driveId) return;
    try {
      const [ts, ps] = await Promise.all([
        driveBackend.getStorageTargets(driveId),
        driveBackend.getS3Presets().catch(() => [] as S3Preset[]),
      ]);
      setTargets(ts);
      setAllPresets(ps);
      setLoadError(null);
      testAll(driveId, ts);
    } catch (e: any) {
      setLoadError(e?.response?.status ? `HTTP ${e.response.status}` : String(e?.message ?? e));
    }
  }

  function testAll(driveId: string, ts: DriveStorageTarget[]) {
    const initial: Record<string, HealthResult> = {};
    ts.forEach(t => { initial[t.id] = { state: 'loading' }; });
    setHealth(initial);

    ts.forEach(async (t) => {
      try {
        const result = await driveBackend.testStorageTarget(driveId, t.id);
        setHealth(prev => ({ ...prev, [t.id]: { state: result.ok ? 'ok' : 'error', error: result.error } }));
      } catch (e: any) {
        const msg = e?.response?.data?.detail ?? e?.message ?? 'Unknown error';
        setHealth(prev => ({ ...prev, [t.id]: { state: 'error', error: msg } }));
      }
    });
  }

  useEffect(() => { load(); }, [driveId]);

  async function handleMakeMaster(targetId: string) {
    if (!driveId || busy) return;
    setBusy(true);
    try {
      await driveBackend.makeMaster(driveId, targetId);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!driveId || !deleteTarget || busy) return;
    setBusy(true);
    try {
      await driveBackend.deleteStorageTarget(driveId, deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleAddSlave() {
    if (!driveId || busy) return;
    if (newSlave.mode === 'custom' && !isCustomValid(newSlave.custom)) {
      alert('Please fill in all storage connection fields');
      return;
    }
    const input = buildTargetInput(newSlave);
    if (!input) return;
    setBusy(true);
    try {
      await driveBackend.addStorageTarget(driveId, input);
      setShowAddSlave(false);
      setNewSlave(emptyTarget(allPresets[0]?.id ?? ''));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const activeSlaveCount = targets.filter(t => t.role === 'SLAVE' && t.status !== 'REMOVING').length;
  const canAddSlave = activeSlaveCount < 2;

  return (
    <div className="absolute top-14 bottom-0 inset-x-0 pl-10 pt-8 overflow-y-auto">
      <h1 className="font-montserrat text-3xl font-bold">Drive Settings</h1>
      <main className="mt-5 max-w-lg space-y-6 pb-10">

        <section className="space-y-4">
          <div className="font-montserrat text-xl font-bold">Storage targets</div>

          {loadError && <p className="text-sm text-red-500">Failed to load targets: {loadError}</p>}

          {targets.length === 0 && !loadError && (
            <p className="text-sm text-muted-foreground">No targets found.</p>
          )}

          <div className="space-y-3">
            {targets.map(t => {
              const disabledReason = makeMasterDisabledReason(t);
              return (
                <div key={t.id} className="border rounded p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t.role}</span>
                    {tierBadge(t.tier)}
                    {statusBadge(t.status)}
                    <span className="text-sm font-medium">{targetLabel(t)}</span>
                    {healthBadge(health[t.id])}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span title={disabledReason ?? undefined}>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!!disabledReason || busy}
                        onClick={() => handleMakeMaster(t.id)}
                      >
                        Make master
                      </Button>
                    </span>
                    {t.role === 'SLAVE' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={busy}
                        onClick={() => setDeleteTarget(t)}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                  {disabledReason && t.role !== 'MASTER' && (
                    <p className="text-xs text-muted-foreground">{disabledReason}</p>
                  )}
                </div>
              );
            })}
          </div>

          {canAddSlave && !showAddSlave && (
            <Button variant="outline" size="sm" onClick={() => {
              setNewSlave(emptyTarget(allPresets[0]?.id ?? ''));
              setShowAddSlave(true);
            }}>
              + Add slave storage
            </Button>
          )}

          {showAddSlave && (
            <div className="border rounded p-4 space-y-4">
              <TargetPicker label="New slave" target={newSlave} hotOnly={false} allPresets={allPresets} onChange={setNewSlave} />
              {!isTargetReady(newSlave) && newSlave.mode === 'custom' && (
                <p className="text-xs text-muted-foreground">Test the connection before adding</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddSlave} disabled={busy || !isTargetReady(newSlave)}>
                  {busy ? 'Adding…' : 'Add'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddSlave(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </section>
      </main>

      <Dialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete slave storage?</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p>Data on <strong>{deleteTarget ? targetLabel(deleteTarget) : ''}</strong> will be permanently deleted and cannot be recovered.</p>
                <p className="mt-2 text-destructive font-medium">This action cannot be undone.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy}>
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
