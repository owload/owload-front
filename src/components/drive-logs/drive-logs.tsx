import { DescriptionFsOperation, FsOperationType, MkDirFsOperation, UploadFinishFsOperation, UploadStartFsOperation } from "@/engine/service/fs-operation";
import { FsOperationWrapper } from "@/engine/service/ops-repository";
import { useFilesStore } from "@/stores/files-store";
import { AbortContext } from "@/types/types";
import { useEffect, useState } from "react";

export function DriveLogs() {
  let driveClient = useFilesStore((state) => state.driveClient);
  let [ops, setOps] = useState<FsOperationWrapper[]>([]);

  useEffect(() => {
    if (!driveClient) return;
    const abortContext: AbortContext = { aborted: false };
    driveClient?.getAllOperations().then((allOps) => {
      if (abortContext.aborted) {
        return;
      }
      console.log("Fetched all ops:", allOps);
      setOps(allOps);
    });
  }, [driveClient]);

  return (
    <div className='absolute top-14 bottom-0 inset-x-0'>
      {(ops.map((op) => (
        <div key={op.startBytePos} className="p-2 border-b border-gray-300">
          <div><strong>Pos:</strong>{op.startBytePos}</div>
          <div><strong>Len:</strong>{op.byteLength}</div>
          <div><strong>Valid:</strong>{op.valid ? "valid" : "error"}</div>
          <div><strong>Valid:</strong>{op.rejectionReason}</div>
          <div>{op.op?.createdBy}, {op.op?.timestamp}</div>
          {op.op?.operationType}
          {op.op?.operationType === FsOperationType.DESCRIPTION &&
            <div>
              Set description for drive: "{(op.op as DescriptionFsOperation).description}"
            </div>}

            {op.op?.operationType === FsOperationType.MK_DIR &&
            <div>
              Create directory "{(op.op as MkDirFsOperation).path}"
            </div>}

            {op.op?.operationType === FsOperationType.START_UPLOAD &&
            <div>
              Start upload file "{(op.op as UploadStartFsOperation).path}" of size {(op.op as UploadStartFsOperation).byteLength} bytes
            </div>}
            {op.op?.operationType === FsOperationType.FINISH_UPLOAD &&
            <div>
              Upload finished {(op.op as UploadFinishFsOperation).uploadStartOperationHash} bytes
            </div>}
        </div>
      )))}
    </div >
  );
}
