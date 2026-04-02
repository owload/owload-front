import { useUserInfo } from "@/auth-context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RestDriveBackend } from "@/engine";
import { useFilesStoreOps } from "@/hooks/use-files-store-ops";
import { useFilesStore } from "@/stores/files-store";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export function CreateDrivePage() {
  const userInfo = useUserInfo();
  const { initialize, setDriveDescription } = useFilesStoreOps();
  const updateDrives = useFilesStore((state) => state.updateDrives);
  const navigate = useNavigate();

  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  async function handleCreateButtonClick() {
    if (!title || !description || !password) {
      alert("Please fill in all fields");
      return;
    }

    const driveBackend = new RestDriveBackend();
    const driveInfo = await driveBackend.createDrive(title);
    const driveId = driveInfo.id;
    await updateDrives();
    await initialize(userInfo.id, driveId, userInfo.privateKey!, password, "/", {aborted: false});
    await setDriveDescription(description);
    await navigate(`/drive/${driveId}`);
  }


  return (
    <>
      <div className='absolute top-14 bottom-0 inset-x-0 pl-10 pt-8'>
        <h1 className="font-montserrat text-3xl font-bold">Create new drive</h1>
        <main className="mt-5">
          <div className="font-montserrat text-xl font-bold">General info</div>
          <div>
            Drive name:
            <Input className="w-100" value={title} onChange={(e) => { setTitle(e.target.value) }}></Input>
            Description:
            <Input className="w-100" value={description} onChange={(e) => { setDescription(e.target.value) }}></Input>
            Password:
            <Input className="w-100" value={password} onChange={(e) => { setPassword(e.target.value) }}></Input>
            <Button className="m-5" onClick={handleCreateButtonClick}>Create</Button>
          </div>
        </main>
      </div>
    </>
  )
}
