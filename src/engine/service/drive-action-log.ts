export type DriveActionType =
  | 'CREATE_DRIVE'
  | 'START_SESSION'
  | 'FINALIZE_SESSION'
  | 'SAVE_OP'
  | 'GET_OPS'
  | 'SAVE_DATA'
  | 'GET_DATA'
  | 'DELETE_DATA';

export type DriveActionLogEntry = {
  id: string;
  driveId: string;
  userId: string;
  action: DriveActionType;
  attributes: Record<string, unknown>;
  timestamp: number;
};
