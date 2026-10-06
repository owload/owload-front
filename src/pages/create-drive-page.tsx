import { Button } from "@/components/ui/button";
import { RestDriveBackend, S3Preset } from "@/engine";
import { TargetConfig, TestState, TargetPicker, buildTargetInput, emptyTarget, findDuplicateTarget, isCustomValid } from "@/components/storage/target-picker";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { RestoreDrivesDialog } from "@/components/storage/restore-drives-dialog";
import { ArchiveRestore, ArrowLeft, Lock, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Rings, TopRow } from "@/components/drives/page-top";
import { AccessSection } from "@/components/drives/new-drive/access-section";
import { Field, FieldError, FormSection, PasswordInput, PasswordStrengthMeter, RepeatCheck, useFieldId } from "@/components/drives/new-drive/form-parts";

export function CreateDrivePage() {
  const { initialize, setDriveDescription } = useFilesStoreOps();
  const updateDrives = useFilesStore((state) => state.updateDrives);
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  // set by the first try to create the drive: from then on the fields left empty are marked
  const [submitted, setSubmitted] = useState(false);

  const [allPresets, setAllPresets] = useState<S3Preset[]>([]);
  const [presetsError, setPresetsError] = useState<string | null>(null);

  const [master, setMaster] = useState<TargetConfig>(emptyTarget());
  const [slaves, setSlaves] = useState<TargetConfig[]>([]);

  const [restoreOpen, setRestoreOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
    setSubmitted(true);
    if (!title.trim() || !description.trim() || !password) { setCreateError(null); return; }
    if (password !== repeatPassword) { setCreateError("The passwords don’t match"); return; }

    if (master.mode === 'custom' && !isCustomValid(master.custom)) {
      setCreateError("Please fill in all master storage connection fields");
      return;
    }
    for (const [i, slave] of slaves.entries()) {
      if (slave.mode === 'custom' && !isCustomValid(slave.custom)) {
        setCreateError(`Please fill in all connection fields for slave ${i + 1}`);
        return;
      }
    }
    if (findDuplicateTarget(master, slaves)) {
      setCreateError("Each storage target must use a unique S3 configuration. Remove or change the duplicate.");
      return;
    }

    setLoading(true);
    setCreateError(null);
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
    } catch (e: any) {
      setCreateError(e?.response?.data?.detail ?? e?.message ?? 'Failed to create drive');
    } finally {
      setLoading(false);
    }
  }

  const nameId = useFieldId("drive-name");
  const descriptionId = useFieldId("drive-description");
  const passwordId = useFieldId("drive-password");
  const repeatId = useFieldId("drive-password-repeat");
  const mismatch = repeatPassword !== "" && repeatPassword !== password;

  return (
    <div className="drives-theme absolute inset-0 overflow-y-auto bg-white">
      <div className="relative">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[250px] overflow-hidden"><Rings /></div>
        <TopRow />
        <main className="relative flex flex-col gap-[22px] px-4 pb-10 pt-1 md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <Link to="/" className="flex items-center gap-1.5 text-[13px] font-semibold text-[#3b3a34]">
                <ArrowLeft aria-hidden="true" className="size-3.5" strokeWidth={2.2} />
                <span>My drives</span>
              </Link>
              <h1 className="m-0 text-[32px] font-semibold leading-[1.2] tracking-[-0.01em] max-md:text-[28px]">New drive</h1>
            </div>
            {/* A rescue path for drives that already exist on a storage; secondary to creating one. */}
            <Button type="button" variant="outline" className="h-11 flex-none gap-2 rounded-[10px] border-sunny-line px-4" onClick={() => setRestoreOpen(true)}>
              <ArchiveRestore aria-hidden="true" className="size-4" /> Restore from storage
            </Button>
          </div>
          <RestoreDrivesDialog open={restoreOpen} onOpenChange={setRestoreOpen} onRestored={() => navigate('/')} />

          <form className="m-0 flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); handleCreate(); }}>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-5">
              <FormSection number={1} title="General info">
                <Field label="Drive name" htmlFor={nameId}>
                  <Input id={nameId} autoComplete="off" value={title} onChange={e => setTitle(e.target.value)} aria-invalid={(submitted && !title.trim()) || undefined} />
                  {submitted && !title.trim() && <FieldError>Enter a name for the drive</FieldError>}
                </Field>
                <Field label="Description" htmlFor={descriptionId}>
                  <Input id={descriptionId} autoComplete="off" value={description} onChange={e => setDescription(e.target.value)} aria-invalid={(submitted && !description.trim()) || undefined} />
                  {submitted && !description.trim() && <FieldError>Enter a description</FieldError>}
                </Field>
                <Field label="Password" htmlFor={passwordId}>
                  <PasswordInput id={passwordId} label="password" value={password} onChange={setPassword} invalid={submitted && !password} />
                  {submitted && !password && <FieldError>Enter a password</FieldError>}
                  <PasswordStrengthMeter password={password} />
                </Field>
                <Field label="Repeat password" htmlFor={repeatId}>
                  <PasswordInput id={repeatId} label="repeat password" value={repeatPassword} onChange={setRepeatPassword} invalid={mismatch} />
                  <RepeatCheck password={password} repeat={repeatPassword} />
                </Field>
              </FormSection>

              <AccessSection />

              <div className="flex min-w-0 flex-col gap-3">
                <FormSection number={3} title="Storage" aside={null}>
                  {presetsError && (
                    <p role="alert" className="m-0 text-[13px] text-destructive">Failed to load presets: {presetsError}</p>
                  )}
                  <TargetPicker label="Master" target={master} hotOnly allPresets={allPresets} onChange={setMaster} />
                </FormSection>

                {slaves.map((slave, i) => (
                  <section key={i} className="flex min-w-0 flex-col gap-3.5 rounded-2xl border border-sunny-line bg-white p-5 shadow-[0_6px_18px_rgba(0,0,0,0.06)]">
                    <TargetPicker
                      label={`Slave ${i + 1}`}
                      target={slave}
                      hotOnly={false}
                      allPresets={allPresets}
                      onChange={t => updateSlave(i, t)}
                      headerLeading={<Button type="button" variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => removeSlave(i)}>Remove</Button>}
                    />
                  </section>
                ))}

                {slaves.length < 2 && (
                  <button type="button" onClick={addSlave} className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-input text-sm font-semibold outline-sunny-ink hover:bg-sunny-field focus-visible:outline-2">
                    <Plus aria-hidden="true" className="size-[15px]" strokeWidth={2.4} />
                    <span>Add slave storage</span>
                  </button>
                )}
              </div>
            </div>

            {createError && <p role="alert" className="m-0 text-[13px] font-semibold text-destructive">{createError}</p>}
            <div className="flex justify-end gap-2 border-t border-sunny-line pt-4">
              <Button type="button" variant="ghost" className="h-11 rounded-[10px] px-4" onClick={() => navigate('/')}>Cancel</Button>
              <Button type="submit" className="h-11 gap-2 rounded-[10px] px-5" disabled={loading}>
                <Lock aria-hidden="true" className="size-4" strokeWidth={2.2} />
                {loading ? 'Creating…' : 'Create drive'}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}
