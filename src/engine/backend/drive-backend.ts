import { postApiCall, getApiCall, deleteApiCall, patchApiCall } from "../api/api";
import { getRandomNonce } from "../core/enc";
import { uint8ArrayToBase64 } from "../core/stream-utils";
import { type UserId } from "./user-backend";

export type DriveId = string;

export enum Privilege {
  READ,
  WRITE,
}

export interface DriveInfo {
  id: DriveId;
  ownerUserId: UserId;
  title: string;
  ACL: Map<UserId, Set<Privilege>>;
  createdTimestamp: number;
  keyNonce: string;
  counterNonce: string;
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

export abstract class DriveBackend {
  abstract createDrive(title: string, storageTarget?: StorageTargetInput): Promise<DriveInfo>;
  abstract getDriveInfo(driveId: DriveId): Promise<DriveInfo>;
  abstract getAccessibleDrives(): Promise<DriveInfo[]>;
  abstract getS3Presets(): Promise<S3Preset[]>;
  abstract addStorageTarget(driveId: DriveId, target: StorageTargetInput): Promise<void>;
  abstract getStorageTargets(driveId: DriveId): Promise<DriveStorageTarget[]>;
  abstract makeMaster(driveId: DriveId, targetId: string): Promise<void>;
  abstract deleteStorageTarget(driveId: DriveId, targetId: string): Promise<void>;
  abstract testCustomConfig(config: CustomStorageConfig): Promise<{ ok: boolean; error?: string }>;
  abstract testStorageTarget(driveId: DriveId, targetId: string): Promise<{ ok: boolean; error?: string }>;
  abstract testPreset(presetId: string): Promise<{ ok: boolean; error?: string }>;
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

  deleteStorageTarget(driveId: DriveId, targetId: string): Promise<void> {
    return deleteApiCall(`/drives/${driveId}/storage-targets/${targetId}?confirm=true`);
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
}
