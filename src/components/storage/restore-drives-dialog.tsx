import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { describeApiErrorLines } from "@/engine/api/api-error";
import { type CustomStorageConfig, type FoundDrive, type RestoreResult, RestDriveBackend } from "@/engine";
import { useFilesStore } from "@/stores/files-store";
import { useState } from "react";
import { emptyCustom, isCustomValid } from "./target-picker";
import { describeRestoreResult, foundDriveLabel, restoreBlockedHint, shortDriveId } from "./restore-messages";

type Step = "connect" | "choose" | "done";

/**
 * Brings drives back from a bucket the user connects. A rescue path, opened
 * from a small button in the "My drives" header, not part of creating a drive
 * (owload-docs/epics/0022). The connection is only held in this component's
 * state and is dropped when the dialog closes.
 */
export function RestoreDrivesDialog({ open, onOpenChange, onRestored }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the dialog is closed after at least one drive was restored. */
  onRestored?: () => void;
}) {
  const updateDrives = useFilesStore((state) => state.updateDrives);

  const [step, setStep] = useState<Step>("connect");
  const [config, setConfig] = useState<CustomStorageConfig>(emptyCustom());
  const [busy, setBusy] = useState(false);
  const [errorLines, setErrorLines] = useState<string[]>([]);
  const [found, setFound] = useState<FoundDrive[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<RestoreResult[]>([]);

  function setField<K extends keyof CustomStorageConfig>(key: K, value: CustomStorageConfig[K]) {
    setConfig((c) => ({ ...c, [key]: value }));
  }

  function handleOpenChange(next: boolean) {
    if (busy) return;
    const anyRestored = results.some((r) => r.status === "RESTORED");
    if (!next) {
      setStep("connect");
      setConfig(emptyCustom());
      setErrorLines([]);
      setFound([]);
      setSelected(new Set());
      setResults([]);
    }
    onOpenChange(next);
    if (!next && anyRestored) onRestored?.();
  }

  async function scan() {
    setBusy(true);
    setErrorLines([]);
    try {
      const result = await new RestDriveBackend().scanRestorableDrives(config);
      setFound(result.drives);
      setTruncated(result.truncated);
      setSelected(new Set(result.drives.filter((d) => d.status === "RESTORABLE").map((d) => d.driveId)));
      setStep("choose");
    } catch (e) {
      setErrorLines(describeApiErrorLines(e, "The storage could not be read."));
    } finally {
      setBusy(false);
    }
  }

  async function restore() {
    setBusy(true);
    setErrorLines([]);
    try {
      const restored = await new RestDriveBackend().restoreDrives(config, [...selected]);
      setResults(restored);
      setStep("done");
      if (restored.some((r) => r.status === "RESTORED")) await updateDrives();
    } catch (e) {
      setErrorLines(describeApiErrorLines(e, "The drives could not be restored."));
    } finally {
      setBusy(false);
    }
  }

  function toggle(driveId: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(driveId);
      else next.delete(driveId);
      return next;
    });
  }

  const titleOf = (driveId: string) => {
    const drive = found.find((d) => d.driveId === driveId);
    return drive ? foundDriveLabel(drive) : "Drive";
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Restore drives from storage</DialogTitle>
          <DialogDescription>
            {step === "connect" && "Connect an S3 storage that holds drives you used before. Nothing is changed on the storage."}
            {step === "choose" && "Choose the drives to bring back."}
            {step === "done" && "Open a restored drive with the password it was created with."}
          </DialogDescription>
        </DialogHeader>

        {step === "connect" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <label className="text-sm font-medium">Endpoint URL</label>
                <Input placeholder="https://s3.amazonaws.com" value={config.endpointUrl} onChange={(e) => setField("endpointUrl", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Region</label>
                <Input placeholder="us-east-1" value={config.region} onChange={(e) => setField("region", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Bucket</label>
                <Input value={config.bucket} onChange={(e) => setField("bucket", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Access key</label>
                <Input autoComplete="off" value={config.accessKey} onChange={(e) => setField("accessKey", e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Secret key</label>
                <Input type="password" autoComplete="off" value={config.secretKey} onChange={(e) => setField("secretKey", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input id="restore-ssl" type="checkbox" checked={config.useSsl} onChange={(e) => setField("useSsl", e.target.checked)} className="h-4 w-4" />
              <label className="text-sm font-medium" htmlFor="restore-ssl">Use SSL</label>
            </div>
          </div>
        )}

        {step === "choose" && (
          <div className="space-y-2">
            {found.length === 0 && <p className="text-sm text-muted-foreground">No drives were found on this storage.</p>}
            <ul className="max-h-72 overflow-y-auto divide-y border rounded">
              {found.map((drive) => {
                const hint = restoreBlockedHint(drive);
                const id = `restore-${drive.driveId}`;
                return (
                  <li key={drive.driveId} className="flex items-start gap-3 p-3">
                    <Checkbox
                      id={id}
                      className="mt-1"
                      disabled={hint !== null}
                      checked={selected.has(drive.driveId)}
                      onCheckedChange={(checked) => toggle(drive.driveId, checked === true)}
                    />
                    <label htmlFor={id} className={hint ? "text-muted-foreground" : "cursor-pointer"}>
                      <span className="block text-sm font-medium">
                        {foundDriveLabel(drive)} <span className="font-mono text-xs font-normal text-muted-foreground">{shortDriveId(drive.driveId)}</span>
                      </span>
                      {drive.createdTimestamp !== null && (
                        <span className="block text-xs text-muted-foreground">Created {new Date(drive.createdTimestamp).toLocaleDateString()}</span>
                      )}
                      {hint && <span className="block text-xs mt-1">{hint}</span>}
                    </label>
                  </li>
                );
              })}
            </ul>
            {truncated && <p className="text-xs text-muted-foreground">Only the first drives on this storage are listed.</p>}
            <p className="text-xs text-muted-foreground">
              A restored drive becomes yours, uses this storage as its main storage, and starts with no shared access.
            </p>
          </div>
        )}

        {step === "done" && (
          <ul className="max-h-72 overflow-y-auto divide-y border rounded">
            {results.map((result) => {
              const outcome = describeRestoreResult(result);
              return (
                <li key={result.driveId} className="p-3">
                  <span className="block text-sm font-medium">
                    {titleOf(result.driveId)} <span className="font-mono text-xs font-normal text-muted-foreground">{shortDriveId(result.driveId)}</span>
                  </span>
                  <span className={`block text-xs ${outcome.ok ? "text-green-600" : "text-red-500"}`}>{outcome.text}</span>
                </li>
              );
            })}
          </ul>
        )}

        {errorLines.length > 0 && (
          <div role="alert" className="text-sm text-red-500 space-y-0.5">
            {errorLines.map((line, i) => <p key={i}>{line}</p>)}
          </div>
        )}

        <DialogFooter>
          {step === "connect" && (
            <Button disabled={busy || !isCustomValid(config)} onClick={scan}>{busy ? "Searching…" : "Find drives"}</Button>
          )}
          {step === "choose" && (
            <>
              <Button variant="outline" disabled={busy} onClick={() => { setStep("connect"); setErrorLines([]); }}>Back</Button>
              <Button disabled={busy || selected.size === 0} onClick={restore}>
                {busy ? "Restoring…" : selected.size === 1 ? "Restore 1 drive" : `Restore ${selected.size} drives`}
              </Button>
            </>
          )}
          {step === "done" && <Button onClick={() => handleOpenChange(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
