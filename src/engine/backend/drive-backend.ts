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

export abstract class DriveBackend {
  abstract createDrive(title: string): Promise<DriveInfo>;
  abstract getDriveInfo(driveId: DriveId): Promise<DriveInfo>;
  abstract getAccessibleDrives(): Promise<DriveInfo[]>;
}

export class RestDriveBackend implements DriveBackend {
  createDrive(title: string): Promise<DriveInfo> {
    const keyNonce = uint8ArrayToBase64(getRandomNonce());
    const counterNonce = uint8ArrayToBase64(getRandomNonce());
    return postApiCall(`/containers`, { title, keyNonce, counterNonce });
  }

  getAccessibleDrives(): Promise<DriveInfo[]> {
    return getApiCall(`/containers`);
  }

  getDriveInfo(driveId: DriveId): Promise<DriveInfo> {
    return getApiCall(`/containers/${driveId}`);
  }
}
