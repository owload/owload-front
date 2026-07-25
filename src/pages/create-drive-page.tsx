import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestDriveBackend, S3Preset, StorageTargetInput, CustomStorageConfig } from "@/engine";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type TargetMode = 'preset' | 'custom';

interface TargetConfig {
  mode: TargetMode;
  presetId: string;
  custom: CustomStorageConfig;
}

const emptyCustom = (): CustomStorageConfig => ({
  endpointUrl: '',
  region: '',
  bucket: '',
  accessKey: '',
  secretKey: '',
  useSsl: true,
});

const emptyTarget = (firstPresetId = ''): TargetConfig => ({
  mode: firstPresetId ? 'preset' : 'custom',
  presetId: firstPresetId,
  custom: emptyCustom(),
});

function buildTargetInput(t: TargetConfig): StorageTargetInput | undefined {
  if (t.mode === 'preset' && t.presetId) return { presetId: t.presetId };
  if (t.mode === 'custom') return { customConfig: t.custom };
  return undefined;
}

function isCustomValid(c: CustomStorageConfig) {
  return !!(c.endpointUrl && c.region && c.bucket && c.accessKey && c.secretKey);
}

function targetDedupeKey(t: TargetConfig): string | null {
  if (t.mode === 'preset' && t.presetId) return `preset:${t.presetId}`;
  if (t.mode === 'custom' && t.custom.endpointUrl && t.custom.bucket) return `custom:${t.custom.endpointUrl}:${t.custom.bucket}`;
  return null;
}

function findDuplicateTarget(master: TargetConfig, slaves: TargetConfig[]): string | null {
  const all = [master, ...slaves];
  const keys = all.map(targetDedupeKey);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] === null) continue;
    for (let j = i + 1; j < keys.length; j++) {
      if (keys[i] === keys[j]) return keys[i]!;
    }
  }
  return null;
}

interface TargetPickerProps {
  label: string;
  target: TargetConfig;
  hotOnly: boolean;
  allPresets: S3Preset[];
  onChange: (t: TargetConfig) => void;
}

function TargetPicker({ label, target, hotOnly, allPresets, onChange }: TargetPickerProps) {
  const presets = hotOnly ? allPresets.filter(p => p.tier === 'hot') : allPresets;

  function setMode(mode: TargetMode) {
    onChange({ ...target, mode });
  }

  function setCustomField(field: keyof CustomStorageConfig, value: string | boolean) {
    onChange({ ...target, custom: { ...target.custom, [field]: value } });
  }

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
            onChange={e => onChange({ ...target, presetId: e.target.value })}
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
        </div>
      )}
    </div>
  );
}

export function CreateDrivePage() {
  const { initialize, setDriveDescription } = useFilesStoreOps();
  const updateDrives = useFilesStore((state) => state.updateDrives);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');

  const [allPresets, setAllPresets] = useState<S3Preset[]>([]);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  const [master, setMaster] = useState<TargetConfig>(emptyTarget());
  const [slaves, setSlaves] = useState<TargetConfig[]>([]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const driveBackend = new RestDriveBackend();
    driveBackend.getS3Presets().then((presets) => {
      setAllPresets(presets);
      const firstHot = presets.find(p => p.tier === 'hot');
      setMaster(emptyTarget(firstHot?.id ?? ''));
    }).catch((e) => {
      console.error('GET /s3-presets failed:', e);
      setPresetsError(e?.response?.status ? `HTTP ${e.response.status}: ${e.response.data?.detail ?? e.message}` : String(e?.message ?? e));
    });
  }, []);

  function addSlave() {
    if (slaves.length >= 2) return;
    const firstPreset = allPresets[0];
    setSlaves(prev => [...prev, emptyTarget(firstPreset?.id ?? '')]);
  }

  function removeSlave(i: number) {
    setSlaves(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateSlave(i: number, t: TargetConfig) {
    setSlaves(prev => prev.map((s, idx) => idx === i ? t : s));
  }

  async function handleCreate() {
    if (!title || !description || !password) { alert("Please fill in all fields"); return; }

    const masterInput = buildTargetInput(master);
    if (master.mode === 'custom' && !isCustomValid(master.custom)) {
      alert("Please fill in all master storage connection fields");
      return;
    }

    for (const [i, slave] of slaves.entries()) {
      if (slave.mode === 'custom' && !isCustomValid(slave.custom)) {
        alert(`Please fill in all connection fields for slave ${i + 1}`);
        return;
      }
    }

    if (findDuplicateTarget(master, slaves)) {
      alert("Each storage target must use a unique S3 configuration. Remove or change the duplicate.");
      return;
    }

    setLoading(true);
    try {
      const driveBackend = new RestDriveBackend();
      const driveInfo = await driveBackend.createDrive(title, masterInput);
      const driveId = driveInfo.id;

      for (const slave of slaves) {
        const slaveInput = buildTargetInput(slave);
        if (slaveInput) await driveBackend.addStorageTarget(driveId, slaveInput);
      }

      await updateDrives();
      await initialize(driveId, password, "/", { aborted: false });
      await setDriveDescription(description);
      await navigate(`/drive/${driveId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute top-14 bottom-0 inset-x-0 pl-10 pt-8 overflow-y-auto">
      <h1 className="font-montserrat text-3xl font-bold">Create new drive</h1>
      <main className="mt-5 max-w-lg space-y-6 pb-10">

        <section className="space-y-3">
          <div className="font-montserrat text-xl font-bold">General info</div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Drive name</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Input value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
        </section>

        <section className="space-y-5">
          <div className="font-montserrat text-xl font-bold">Storage</div>

          {presetsError && (
            <p className="text-sm text-red-500">Failed to load presets: {presetsError}</p>
          )}

          <TargetPicker label="Master" target={master} hotOnly allPresets={allPresets} onChange={setMaster} />

          {slaves.map((slave, i) => (
            <div key={i} className="space-y-3">
              <div className="flex items-center justify-between">
                <TargetPicker label={`Slave ${i + 1}`} target={slave} hotOnly={false} allPresets={allPresets} onChange={t => updateSlave(i, t)} />
                <button onClick={() => removeSlave(i)} className="ml-4 mt-5 text-sm text-muted-foreground hover:text-red-500 shrink-0">Remove</button>
              </div>
            </div>
          ))}

          {slaves.length < 2 && (
            <Button variant="outline" size="sm" onClick={addSlave}>+ Add slave storage</Button>
          )}
        </section>

        <Button onClick={handleCreate} disabled={loading}>
          {loading ? 'Creating…' : 'Create'}
        </Button>
      </main>
    </div>
  );
}
