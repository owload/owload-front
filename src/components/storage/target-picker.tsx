import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
}

export function TargetPicker({ label, target, hotOnly, allPresets, excludePresetIds, onChange }: TargetPickerProps) {
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

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="flex gap-2">
        <Button variant={target.mode === 'preset' ? 'default' : 'outline'} size="sm" onClick={() => setMode('preset')}>Preset</Button>
        <Button variant={target.mode === 'custom' ? 'default' : 'outline'} size="sm" onClick={() => setMode('custom')}>Custom</Button>
      </div>

      {target.mode === 'preset' && (
        presets.length > 0 ? (
          <select
            className="w-full border rounded px-3 py-2 text-sm bg-background"
            value={target.presetId}
            onChange={e => onChange({ ...target, presetId: e.target.value, testState: 'untested', testError: undefined })}
          >
            {presets.map(p => <option key={p.id} value={p.id}>{p.label}{p.tier === 'cold' ? ' (cold)' : ''}</option>)}
          </select>
        ) : (
          <p className="text-sm text-muted-foreground">No presets available.</p>
        )
      )}

      {target.mode === 'custom' && (
        <div className="space-y-3 border rounded p-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-sm font-medium">Endpoint URL</label>
              <Input placeholder="https://s3.amazonaws.com" value={target.custom.endpointUrl} onChange={e => setCustomField('endpointUrl', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Region</label>
              <Input placeholder="us-east-1" value={target.custom.region} onChange={e => setCustomField('region', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Bucket</label>
              <Input value={target.custom.bucket} onChange={e => setCustomField('bucket', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Access key</label>
              <Input value={target.custom.accessKey} onChange={e => setCustomField('accessKey', e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Secret key</label>
              <Input type="password" value={target.custom.secretKey} onChange={e => setCustomField('secretKey', e.target.value)} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input id={`ssl-${label}`} type="checkbox" checked={target.custom.useSsl} onChange={e => setCustomField('useSsl', e.target.checked)} className="h-4 w-4" />
            <label className="text-sm font-medium" htmlFor={`ssl-${label}`}>Use SSL</label>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button
              size="sm"
              variant="outline"
              disabled={!canTest || target.testState === 'testing'}
              onClick={runTest}
            >
              {target.testState === 'testing' ? 'Testing…' : 'Test connection'}
            </Button>
            {target.testState === 'ok' && (
              <span className="text-sm text-green-600 font-medium">✓ Connected</span>
            )}
            {target.testState === 'error' && (
              <span className="text-sm text-red-500">✗ {target.testError ?? 'Connection failed'}</span>
            )}
            {target.testState === 'untested' && canTest && (
              <span className="text-xs text-muted-foreground">Connection not verified</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
