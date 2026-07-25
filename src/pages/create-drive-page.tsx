import { Button } from "@/components/ui/button";
import { RestDriveBackend, S3Preset } from "@/engine";
import { TargetConfig, TestState, TargetPicker, buildTargetInput, emptyTarget, findDuplicateTarget, isCustomValid } from "@/components/storage/target-picker";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";

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
    setSlaves(prev => [...prev, emptyTarget(allPresets[0]?.id ?? '')]);
  }

  function removeSlave(i: number) {
    setSlaves(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateSlave(i: number, t: TargetConfig) {
    setSlaves(prev => prev.map((s, idx) => idx === i ? t : s));
  }

  async function testIfNeeded(t: TargetConfig): Promise<TargetConfig> {
    if (t.mode !== 'custom' || t.testState === 'ok') return t;
    try {
      const result = await new RestDriveBackend().testCustomConfig(t.custom);
      return { ...t, testState: result.ok ? 'ok' : 'error' as TestState, testError: result.error };
    } catch (e: any) {
      const msg = e?.response?.data?.detail ?? e?.message ?? 'Unknown error';
      return { ...t, testState: 'error', testError: msg };
    }
  }

  async function handleCreate() {
    if (!title || !description || !password) { alert("Please fill in all fields"); return; }

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
      const testedMaster = await testIfNeeded(master);
      const testedSlaves = await Promise.all(slaves.map(testIfNeeded));
      setMaster(testedMaster);
      setSlaves(testedSlaves);

      if (testedMaster.mode === 'custom' && testedMaster.testState !== 'ok') return;
      if (testedSlaves.some(s => s.mode === 'custom' && s.testState !== 'ok')) return;

      const driveBackend = new RestDriveBackend();
      const driveInfo = await driveBackend.createDrive(title, buildTargetInput(testedMaster));
      const driveId = driveInfo.id;

      for (const slave of testedSlaves) {
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
            <div key={i} className="flex items-start gap-3">
              <div className="flex-1">
                <TargetPicker label={`Slave ${i + 1}`} target={slave} hotOnly={false} allPresets={allPresets} onChange={t => updateSlave(i, t)} />
              </div>
              <button onClick={() => removeSlave(i)} className="mt-6 text-sm text-muted-foreground hover:text-red-500 shrink-0">Remove</button>
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
