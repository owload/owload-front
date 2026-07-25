import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RestDriveBackend, S3Preset, StorageTargetInput, CustomStorageConfig } from "@/engine";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

type StorageMode = 'default' | 'preset' | 'custom';

const emptyCustomConfig = (): CustomStorageConfig => ({
  endpointUrl: '',
  region: '',
  bucket: '',
  accessKey: '',
  secretKey: '',
  useSsl: true,
});

export function CreateDrivePage() {
  const { initialize, setDriveDescription } = useFilesStoreOps();
  const updateDrives = useFilesStore((state) => state.updateDrives);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');

  const [storageMode, setStorageMode] = useState<StorageMode>('default');
  const [presets, setPresets] = useState<S3Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [customConfig, setCustomConfig] = useState<CustomStorageConfig>(emptyCustomConfig);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const driveBackend = new RestDriveBackend();
    driveBackend.getS3Presets().then((all) => {
      const hot = all.filter((p) => p.tier === 'hot');
      setPresets(hot);
      if (hot.length > 0) {
        setSelectedPresetId(hot[0].id);
        setStorageMode('preset');
      }
    }).catch(() => {});
  }, []);

  function buildStorageTarget(): StorageTargetInput | undefined {
    if (storageMode === 'preset' && selectedPresetId) {
      return { presetId: selectedPresetId };
    }
    if (storageMode === 'custom') {
      return { customConfig };
    }
    return undefined;
  }

  async function handleCreateButtonClick() {
    if (!title || !description || !password) {
      alert("Please fill in all fields");
      return;
    }
    if (storageMode === 'custom') {
      const { endpointUrl, region, bucket, accessKey, secretKey } = customConfig;
      if (!endpointUrl || !region || !bucket || !accessKey || !secretKey) {
        alert("Please fill in all storage connection fields");
        return;
      }
    }

    setLoading(true);
    try {
      const driveBackend = new RestDriveBackend();
      const driveInfo = await driveBackend.createDrive(title, buildStorageTarget());
      const driveId = driveInfo.id;
      await updateDrives();
      await initialize(driveId, password, "/", { aborted: false });
      await setDriveDescription(description);
      await navigate(`/drive/${driveId}`);
    } finally {
      setLoading(false);
    }
  }

  function setCustomField(field: keyof CustomStorageConfig, value: string | boolean) {
    setCustomConfig((prev) => ({ ...prev, [field]: value }));
  }

  const hasPresets = presets.length > 0;

  return (
    <div className="absolute top-14 bottom-0 inset-x-0 pl-10 pt-8 overflow-y-auto">
      <h1 className="font-montserrat text-3xl font-bold">Create new drive</h1>
      <main className="mt-5 max-w-lg space-y-6 pb-10">

        <section className="space-y-3">
          <div className="font-montserrat text-xl font-bold">General info</div>
          <div className="space-y-2">
            <Label>Drive name</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="font-montserrat text-xl font-bold">Storage</div>

          <div className="flex gap-2">
            {hasPresets && (
              <Button
                variant={storageMode === 'preset' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStorageMode('preset')}
              >
                Preset
              </Button>
            )}
            <Button
              variant={storageMode === 'custom' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStorageMode('custom')}
            >
              Custom
            </Button>
            <Button
              variant={storageMode === 'default' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStorageMode('default')}
            >
              Default
            </Button>
          </div>

          {storageMode === 'preset' && hasPresets && (
            <div className="space-y-2">
              <Label>S3 preset</Label>
              <select
                className="w-full border rounded px-3 py-2 text-sm bg-background"
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
              >
                {presets.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </div>
          )}

          {storageMode === 'custom' && (
            <div className="space-y-3 border rounded p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <Label>Endpoint URL</Label>
                  <Input placeholder="https://s3.amazonaws.com" value={customConfig.endpointUrl} onChange={(e) => setCustomField('endpointUrl', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Region</Label>
                  <Input placeholder="us-east-1" value={customConfig.region} onChange={(e) => setCustomField('region', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Bucket</Label>
                  <Input value={customConfig.bucket} onChange={(e) => setCustomField('bucket', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Access key</Label>
                  <Input value={customConfig.accessKey} onChange={(e) => setCustomField('accessKey', e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Secret key</Label>
                  <Input type="password" value={customConfig.secretKey} onChange={(e) => setCustomField('secretKey', e.target.value)} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="use-ssl"
                  type="checkbox"
                  checked={customConfig.useSsl}
                  onChange={(e) => setCustomField('useSsl', e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="use-ssl">Use SSL</Label>
              </div>
            </div>
          )}

          {storageMode === 'default' && (
            <p className="text-sm text-muted-foreground">
              The server's default S3 storage will be used.
            </p>
          )}
        </section>

        <Button onClick={handleCreateButtonClick} disabled={loading}>
          {loading ? 'Creating…' : 'Create'}
        </Button>
      </main>
    </div>
  );
}
