import { postApiCall, getApiCall } from "../api/api";
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

export type StorageTargetInput =
  | { presetId: string; customConfig?: never }
  | { customConfig: CustomStorageConfig; presetId?: never };

export abstract class DriveBackend {
  abstract createDrive(title: string, storageTarget?: StorageTargetInput): Promise<DriveInfo>;
  abstract getDriveInfo(driveId: DriveId): Promise<DriveInfo>;
  abstract getAccessibleDrives(): Promise<DriveInfo[]>;
  abstract getS3Presets(): Promise<S3Preset[]>;
  abstract addStorageTarget(driveId: DriveId, target: StorageTargetInput): Promise<void>;
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
}
