export type DriveActionType =
  | 'CREATE_DRIVE'
  | 'START_SESSION'
  | 'FINALIZE_SESSION'
  | 'SAVE_OP'
  | 'DELETE_DATA';

export type DriveActionLogEntry = {
  id: string;
  seq: number;
  driveId: string;
  userId: string;
  action: DriveActionType;
  attributes: Record<string, unknown>;
  timestamp: number;
};
