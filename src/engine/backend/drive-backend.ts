import { postApiCall, getApiCall, deleteApiCall, patchApiCall } from "../api/api";
import { getRandomNonce } from "../core/enc";
import { uint8ArrayToBase64 } from "../core/stream-utils";
import { type UserId } from "./user-backend";

export type DriveId = string;

export enum Privilege {
  READ,
  WRITE,
}

/** Who can open a drive: only the owner, the owner and the people added, or also anyone with the link (read-only, no sign-in). */
export type DriveVisibility = "private" | "shared" | "public";
/** What a person may do on a drive: view it; also add and change files; also manage the people and the settings. */
export type DriveRole = "reader" | "writer" | "admin";
export type MyDriveRole = DriveRole | "owner";

export interface DriveInfo {
  id: DriveId;
  ownerUserId: UserId;
  title: string;
  /** The people and their roles; only the owner and an admin get it (for others it is empty). */
  ACL: Record<UserId, DriveRole>;
  createdTimestamp: number;
  keyNonce: string;
  counterNonce: string;
  visibility: DriveVisibility;
  /** What the signed-in user may do on this drive. */
  myRole: MyDriveRole;
  /** How many people the drive is shared with (for the owner and the admins). */
  peopleCount: number;
  /** Who owns a drive that was shared with me. */
  ownerName: string | null;
  ownerEmail: string | null;
};

export type S3PresetTier = 'hot' | 'cold';

export interface S3Preset {
  id: string;
  label: string;
  tier: S3PresetTier;
}

export interface CustomStorageConfig {
  endpointUrl: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  useSsl: boolean;
}

export interface DriveStorageTarget {
  id: string;
  role: 'MASTER' | 'SLAVE';
  status: 'ACTIVE' | 'PROVISIONING' | 'REMOVING';
  tier: S3PresetTier;
  presetId?: string;
  presetLabel?: string;
  isCustom: boolean;
  customEndpointUrl?: string;
  customBucket?: string;
  backfillCopied?: number | null;
  backfillTotal?: number | null;
}

export type StorageTargetInput =
  | { presetId: string; customConfig?: never }
  | { customConfig: CustomStorageConfig; presetId?: never };

export interface CustomTargetDeletionDecision {
  targetId: string;
  deleteData: boolean;
}

/** A drive found in a bucket the user connected, see POST /drives/restore/scan. */
export type FoundDriveStatus = 'RESTORABLE' | 'ALREADY_EXISTS' | 'DAMAGED';

export interface FoundDrive {
  driveId: DriveId;
  title: string | null;
  createdTimestamp: number | null;
  opsBytes: number | null;
  status: FoundDriveStatus;
  /** Why a DAMAGED drive cannot be restored: META_MISSING, META_INVALID, OPS_GAP, OPS_CORRUPT, OPS_TOO_LARGE. */
  reason: string | null;
}

export interface RestoreScanResult {
  drives: FoundDrive[];
  /** The bucket holds more drives than one scan lists. */
  truncated: boolean;
}

export type RestoreResultStatus = 'RESTORED' | 'ALREADY_EXISTS' | 'DAMAGED' | 'NOT_FOUND' | 'FAILED';

export interface RestoreResult {
  driveId: DriveId;
  status: RestoreResultStatus;
  reason: string | null;
}

export abstract class DriveBackend {
  abstract createDrive(title: string, storageTarget?: StorageTargetInput): Promise<DriveInfo>;
  abstract getDriveInfo(driveId: DriveId): Promise<DriveInfo>;
  abstract getAccessibleDrives(): Promise<DriveInfo[]>;
  abstract deleteDrive(driveId: DriveId, customTargetDecisions: CustomTargetDeletionDecision[], force?: boolean): Promise<void>;
  abstract getS3Presets(): Promise<S3Preset[]>;
  abstract addStorageTarget(driveId: DriveId, target: StorageTargetInput): Promise<void>;
  abstract getStorageTargets(driveId: DriveId): Promise<DriveStorageTarget[]>;
  abstract makeMaster(driveId: DriveId, targetId: string): Promise<void>;
  abstract deleteStorageTarget(driveId: DriveId, targetId: string, force?: boolean): Promise<void>;
  abstract testCustomConfig(config: CustomStorageConfig): Promise<{ ok: boolean; error?: string }>;
  abstract testStorageTarget(driveId: DriveId, targetId: string): Promise<{ ok: boolean; error?: string }>;
  abstract testPreset(presetId: string): Promise<{ ok: boolean; error?: string }>;
  abstract scanRestorableDrives(config: CustomStorageConfig): Promise<RestoreScanResult>;
  abstract restoreDrives(config: CustomStorageConfig, driveIds: DriveId[]): Promise<RestoreResult[]>;
}

export class RestDriveBackend implements DriveBackend {
  createDrive(title: string, storageTarget?: StorageTargetInput): Promise<DriveInfo> {
    const keyNonce = uint8ArrayToBase64(getRandomNonce());
    const counterNonce = uint8ArrayToBase64(getRandomNonce());
    return postApiCall(`/drives`, { title, keyNonce, counterNonce, ...storageTarget });
  }

  getAccessibleDrives(): Promise<DriveInfo[]> {
    return getApiCall(`/drives`);
  }

  getDriveInfo(driveId: DriveId): Promise<DriveInfo> {
    return getApiCall(`/drives/${driveId}`);
  }

  deleteDrive(driveId: DriveId, customTargetDecisions: CustomTargetDeletionDecision[], force = false): Promise<void> {
    return deleteApiCall(`/drives/${driveId}${force ? '?force=true' : ''}`, { customTargetDecisions });
  }

  getS3Presets(): Promise<S3Preset[]> {
    return getApiCall(`/s3-presets`);
  }

  addStorageTarget(driveId: DriveId, target: StorageTargetInput): Promise<void> {
    return postApiCall(`/drives/${driveId}/storage-targets`, target);
  }

  getStorageTargets(driveId: DriveId): Promise<DriveStorageTarget[]> {
    return getApiCall(`/drives/${driveId}/storage-targets`);
  }

  makeMaster(driveId: DriveId, targetId: string): Promise<void> {
    return patchApiCall(`/drives/${driveId}/storage-targets/${targetId}/make-master`);
  }

  deleteStorageTarget(driveId: DriveId, targetId: string, force = false): Promise<void> {
    return deleteApiCall(`/drives/${driveId}/storage-targets/${targetId}?confirm=true${force ? '&force=true' : ''}`);
  }

  testCustomConfig(config: CustomStorageConfig): Promise<{ ok: boolean; error?: string }> {
    return postApiCall(`/storage-targets/test`, config);
  }

  testStorageTarget(driveId: DriveId, targetId: string): Promise<{ ok: boolean; error?: string }> {
    return postApiCall(`/drives/${driveId}/storage-targets/${targetId}/test-connection`);
  }

  testPreset(presetId: string): Promise<{ ok: boolean; error?: string }> {
    return postApiCall(`/s3-presets/${presetId}/test-connection`);
  }

  scanRestorableDrives(config: CustomStorageConfig): Promise<RestoreScanResult> {
    return postApiCall(`/drives/restore/scan`, { customConfig: config });
  }

  async restoreDrives(config: CustomStorageConfig, driveIds: DriveId[]): Promise<RestoreResult[]> {
    const response: { results: RestoreResult[] } = await postApiCall(`/drives/restore`, { customConfig: config, driveIds });
    return response.results;
  }
}
