import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { S3Preset, CustomStorageConfig, StorageTargetInput, RestDriveBackend, DriveStorageTarget } from "@/engine";

export type TargetMode = 'preset' | 'custom';
export type TestState = 'untested' | 'testing' | 'ok' | 'error';

export interface TargetConfig {
  mode: TargetMode;
  presetId: string;
  custom: CustomStorageConfig;
  testState: TestState;
  testError?: string;
}

export const emptyCustom = (): CustomStorageConfig => ({
  endpointUrl: '',
  region: '',
  bucket: '',
  accessKey: '',
  secretKey: '',
  useSsl: true,
});

export const emptyTarget = (firstPresetId = ''): TargetConfig => ({
  mode: firstPresetId ? 'preset' : 'custom',
  presetId: firstPresetId,
  custom: emptyCustom(),
  testState: 'untested',
});

export function buildTargetInput(t: TargetConfig): StorageTargetInput | undefined {
  if (t.mode === 'preset' && t.presetId) return { presetId: t.presetId };
  if (t.mode === 'custom') return { customConfig: t.custom };
  return undefined;
}

export function isCustomValid(c: CustomStorageConfig) {
  return !!(c.endpointUrl && c.region && c.bucket && c.accessKey && c.secretKey);
}

export function isTargetReady(t: TargetConfig): boolean {
  if (t.mode === 'preset') return !!t.presetId;
  return t.testState === 'ok';
}

export function targetDedupeKey(t: TargetConfig): string | null {
  if (t.mode === 'preset' && t.presetId) return `preset:${t.presetId}`;
  if (t.mode === 'custom' && t.custom.endpointUrl && t.custom.bucket) return `custom:${t.custom.endpointUrl}:${t.custom.bucket}`;
  return null;
}

export function findDuplicateWithExisting(newTarget: TargetConfig, existing: DriveStorageTarget[]): boolean {
  if (newTarget.mode === 'preset' && newTarget.presetId) {
    return existing.some(t => t.presetId === newTarget.presetId);
  }
  if (newTarget.mode === 'custom' && newTarget.custom.endpointUrl && newTarget.custom.bucket) {
    return existing.some(t => t.isCustom &&
      t.customEndpointUrl === newTarget.custom.endpointUrl &&
      t.customBucket === newTarget.custom.bucket);
  }
  return false;
}

export function findDuplicateTarget(master: TargetConfig, slaves: TargetConfig[]): boolean {
  const all = [master, ...slaves];
  const keys = all.map(targetDedupeKey);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === null) continue;
    for (let j = i + 1; j < keys.length; j++) {
      if (keys[i] === keys[j]) return true;
    }
  }
  return false;
}

interface TargetPickerProps {
  label: string;
  target: TargetConfig;
  hotOnly: boolean;
  allPresets: S3Preset[];
  excludePresetIds?: string[];
  onChange: (t: TargetConfig) => void;
  /** What stands before the label and the Preset / Custom switch in the first row (a card heading, for instance). */
  headerLeading?: React.ReactNode;
}

const fieldClass = "flex min-w-0 flex-col gap-1.5";
const labelClass = "text-[13px] font-semibold";

export function TargetPicker({ label, target, hotOnly, allPresets, excludePresetIds, onChange, headerLeading }: TargetPickerProps) {
  const presets = allPresets
    .filter(p => !hotOnly || p.tier === 'hot')
    .filter(p => !excludePresetIds?.includes(p.id));

  function setMode(mode: TargetMode) {
    onChange({ ...target, mode, testState: 'untested', testError: undefined });
  }

  function setCustomField(field: keyof CustomStorageConfig, value: string | boolean) {
    onChange({ ...target, custom: { ...target.custom, [field]: value }, testState: 'untested', testError: undefined });
  }

  async function runTest() {
    onChange({ ...target, testState: 'testing', testError: undefined });
    try {
      const backend = new RestDriveBackend();
      const result = target.mode === 'preset'
        ? await backend.testPreset(target.presetId)
        : await backend.testCustomConfig(target.custom);
      onChange({ ...target, testState: result.ok ? 'ok' : 'error', testError: result.error });
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Unknown error';
      onChange({ ...target, testState: 'error', testError: msg });
    }
  }

  const canTest = target.mode === 'preset' ? !!target.presetId : isCustomValid(target.custom);
  const tab = "h-[34px] cursor-pointer rounded-full px-3.5 text-sm font-semibold text-foreground outline-ring focus-visible:outline-2";

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex min-h-10 flex-wrap items-center gap-x-2.5 gap-y-2">
        {headerLeading}
        <div className="ml-auto flex items-center gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</span>
          <div role="tablist" aria-label={`${label} storage`} className="flex gap-0.5 rounded-full bg-secondary p-[3px]">
            <button type="button" role="tab" aria-selected={target.mode === 'preset'} className={cn(tab, target.mode === 'preset' && "bg-primary")} onClick={() => setMode('preset')}>Preset</button>
            <button type="button" role="tab" aria-selected={target.mode === 'custom'} className={cn(tab, target.mode === 'custom' && "bg-primary")} onClick={() => setMode('custom')}>Custom</button>
          </div>
        </div>
      </div>

      {target.mode === 'preset' && (
        presets.length > 0 ? (
          <select
            aria-label={`${label} storage preset`}
            className="h-11 w-full rounded-[10px] border border-input bg-white px-3 text-sm"
            value={target.presetId}
            onChange={e => onChange({ ...target, presetId: e.target.value, testState: 'untested', testError: undefined })}
          >
            {presets.map(p => <option key={p.id} value={p.id}>{p.label}{p.tier === 'cold' ? ' (cold)' : ''}</option>)}
          </select>
        ) : (
          <p className="m-0 text-sm text-muted-foreground">No presets available.</p>
        )
      )}

      {target.mode === 'custom' && (
        <>
          <div className={fieldClass}>
            <label htmlFor={`url-${label}`} className={labelClass}>Endpoint URL</label>
            <Input id={`url-${label}`} type="url" placeholder="https://s3.amazonaws.com" autoComplete="off" value={target.custom.endpointUrl} onChange={e => setCustomField('endpointUrl', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldClass}>
              <label htmlFor={`region-${label}`} className={labelClass}>Region</label>
              <Input id={`region-${label}`} placeholder="us-east-1" autoComplete="off" value={target.custom.region} onChange={e => setCustomField('region', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <label htmlFor={`bucket-${label}`} className={labelClass}>Bucket</label>
              <Input id={`bucket-${label}`} autoComplete="off" value={target.custom.bucket} onChange={e => setCustomField('bucket', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className={fieldClass}>
              <label htmlFor={`ak-${label}`} className={labelClass}>Access key</label>
              <Input id={`ak-${label}`} autoComplete="off" value={target.custom.accessKey} onChange={e => setCustomField('accessKey', e.target.value)} />
            </div>
            <div className={fieldClass}>
              <label htmlFor={`sk-${label}`} className={labelClass}>Secret key</label>
              <Input id={`sk-${label}`} type="password" autoComplete="new-password" value={target.custom.secretKey} onChange={e => setCustomField('secretKey', e.target.value)} />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm font-semibold">
              <input type="checkbox" checked={target.custom.useSsl} onChange={e => setCustomField('useSsl', e.target.checked)} className="m-0 size-[18px] accent-sunny-ink" />
              <span>Use SSL</span>
            </label>
            <Button type="button" variant="outline" className="h-11 rounded-[10px] border px-4" disabled={!canTest || target.testState === 'testing'} onClick={runTest}>
              {target.testState === 'testing' ? 'Testing…' : 'Test connection'}
            </Button>
          </div>
          {target.testState === 'ok' && (
            <p role="status" className="m-0 text-[13px] font-semibold text-sunny-green">✓ Connected</p>
          )}
          {target.testState === 'error' && (
            <p role="alert" className="m-0 text-[13px] font-semibold text-destructive">✗ {target.testError ?? 'Connection failed'}</p>
          )}
          {target.testState === 'untested' && canTest && (
            <p className="m-0 text-xs text-muted-foreground">Connection not verified</p>
          )}
        </>
      )}
    </div>
  );
}
