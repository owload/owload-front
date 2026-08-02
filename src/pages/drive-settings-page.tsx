import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TargetConfig, TargetPicker, buildTargetInput, emptyTarget, findDuplicateWithExisting, isCustomValid, isTargetReady } from "@/components/storage/target-picker";
import { DriveInfo, DriveStorageTarget, RestDriveBackend, S3Preset } from "@/engine";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUserInfo } from "@/auth-context-provider";
import { useFilesStore } from "@/stores/files-store";
import { useCloseDrive } from "@/hooks/use-close-drives";

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

function statusBadge(t: DriveStorageTarget) {
  if (t.status === 'PROVISIONING') {
    const progress = t.backfillTotal != null && t.backfillTotal > 0
      ? ` (${t.backfillCopied ?? 0}/${t.backfillTotal})`
      : '';
    return <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">backfill in progress{progress}</span>;
  }
  if (t.status === 'REMOVING') return <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">removing</span>;
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
  const navigate = useNavigate();
  const { id: currentUserId } = useUserInfo();
  const updateDrives = useFilesStore((state) => state.updateDrives);
  const closeDrive = useCloseDrive();

  const [driveInfo, setDriveInfo] = useState<DriveInfo | null>(null);
  const [targets, setTargets] = useState<DriveStorageTarget[]>([]);
  const [health, setHealth] = useState<Record<string, HealthResult>>({});
  const [allPresets, setAllPresets] = useState<S3Preset[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<DriveStorageTarget | null>(null);
  const [showAddSlave, setShowAddSlave] = useState(false);
  const [newSlave, setNewSlave] = useState<TargetConfig>(emptyTarget());

  const [showDeleteDrive, setShowDeleteDrive] = useState(false);
  const [customDecisions, setCustomDecisions] = useState<Record<string, boolean | undefined>>({});
  const [confirmTitle, setConfirmTitle] = useState('');
  const [deletingDrive, setDeletingDrive] = useState(false);
  const [deleteDriveError, setDeleteDriveError] = useState<string | null>(null);

  const driveBackend = new RestDriveBackend();

  async function load() {
    if (!driveId) return;
    try {
      const [info, ts, ps] = await Promise.all([
        driveBackend.getDriveInfo(driveId),
        driveBackend.getStorageTargets(driveId),
        driveBackend.getS3Presets().catch(() => [] as S3Preset[]),
      ]);
      setDriveInfo(info);
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

  const usedPresetIds = new Set(targets.filter(t => t.presetId).map(t => t.presetId!));
  const firstFreePresetId = allPresets.find(p => !usedPresetIds.has(p.id))?.id ?? '';
  const isDuplicateSlave = findDuplicateWithExisting(newSlave, targets);

  async function handleAddSlave() {
    if (!driveId || busy) return;
    const input = buildTargetInput(newSlave);
    if (!input) return;
    setBusy(true);
    try {
      await driveBackend.addStorageTarget(driveId, input);
      setShowAddSlave(false);
      setNewSlave(emptyTarget(firstFreePresetId));
      await load();
    } finally {
      setBusy(false);
    }
  }

  const activeSlaveCount = targets.filter(t => t.role === 'SLAVE' && t.status !== 'REMOVING').length;
  const canAddSlave = activeSlaveCount < 2;

  const isOwner = !!driveInfo && driveInfo.ownerUserId === currentUserId;
  const customTargets = targets.filter(t => t.isCustom);
  const allCustomDecided = customTargets.every(t => customDecisions[t.id] !== undefined);
  const confirmTextMatches = !!driveInfo && confirmTitle === driveInfo.title;

  function openDeleteDrive() {
    setCustomDecisions({});
    setConfirmTitle('');
    setDeleteDriveError(null);
    setShowDeleteDrive(true);
  }

  async function handleDeleteDrive() {
    if (!driveId || !driveInfo || deletingDrive || !allCustomDecided || !confirmTextMatches) return;
    setDeletingDrive(true);
    setDeleteDriveError(null);
    try {
      const decisions = customTargets.map(t => ({ targetId: t.id, deleteData: customDecisions[t.id]! }));
      await driveBackend.deleteDrive(driveId, decisions);
      closeDrive(driveId);
      await updateDrives();
      navigate('/');
    } catch (e: any) {
      setDeleteDriveError(e?.response?.data?.detail ?? e?.message ?? 'Failed to delete drive');
    } finally {
      setDeletingDrive(false);
    }
  }

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
                    {!t.isCustom && tierBadge(t.tier)}
                    {statusBadge(t)}
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
              setNewSlave(emptyTarget(firstFreePresetId));
              setShowAddSlave(true);
            }}>
              + Add slave storage
            </Button>
          )}

          {showAddSlave && (
            <div className="border rounded p-4 space-y-4">
              <TargetPicker label="New slave" target={newSlave} hotOnly={false} allPresets={allPresets} excludePresetIds={targets.filter(t => t.presetId).map(t => t.presetId!)} onChange={setNewSlave} />
              {!isTargetReady(newSlave) && newSlave.mode === 'custom' && (
                <p className="text-xs text-muted-foreground">Test the connection before adding</p>
              )}
              {isDuplicateSlave && (
                <p className="text-xs text-red-500">This drive already has a storage target pointing at the same location</p>
              )}
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddSlave} disabled={busy || !isTargetReady(newSlave) || isDuplicateSlave}>
                  {busy ? 'Adding…' : 'Add'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddSlave(false)}>Cancel</Button>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-3 border border-destructive/30 rounded p-4">
          <div className="font-montserrat text-lg font-bold text-destructive">Danger zone</div>
          <p className="text-sm text-muted-foreground">
            Permanently delete this drive. This cannot be undone.
          </p>
          <span title={isOwner ? undefined : 'Only the drive owner can delete it'}>
            <Button variant="destructive" size="sm" disabled={!isOwner || busy} onClick={openDeleteDrive}>
              Delete drive
            </Button>
          </span>
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

      <Dialog open={showDeleteDrive} onOpenChange={open => !open && setShowDeleteDrive(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{driveInfo?.title}"?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <p className="text-destructive font-medium">This permanently deletes the drive and cannot be undone.</p>

                <div className="space-y-2">
                  {targets.map(t => (
                    <div key={t.id} className="border rounded p-3 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t.role}</span>
                        <span className="text-sm font-medium text-foreground">{targetLabel(t)}</span>
                      </div>
                      {!t.isCustom ? (
                        <p className="text-xs text-muted-foreground">Data will be permanently deleted.</p>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={customDecisions[t.id] === true ? 'destructive' : 'outline'}
                            onClick={() => setCustomDecisions(prev => ({ ...prev, [t.id]: true }))}
                          >
                            Delete data
                          </Button>
                          <Button
                            size="sm"
                            variant={customDecisions[t.id] === false ? 'default' : 'outline'}
                            onClick={() => setCustomDecisions(prev => ({ ...prev, [t.id]: false }))}
                          >
                            Keep data on this S3
                          </Button>
                        </div>
                      )}
                      {t.isCustom && customDecisions[t.id] === undefined && (
                        <p className="text-xs text-amber-600">Choose what happens to this target's data.</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-sm font-medium text-foreground">
                    Type <strong>{driveInfo?.title}</strong> to confirm
                  </label>
                  <Input value={confirmTitle} onChange={e => setConfirmTitle(e.target.value)} autoComplete="off" />
                </div>

                {deleteDriveError && <p className="text-sm text-red-500">{deleteDriveError}</p>}
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDrive(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDeleteDrive}
              disabled={deletingDrive || !allCustomDecided || !confirmTextMatches}
            >
              {deletingDrive ? 'Deleting…' : 'Delete drive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
