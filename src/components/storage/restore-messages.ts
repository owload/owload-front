import { type FoundDrive, type RestoreResult } from "@/engine/backend/drive-backend";

/**
 * Wording for the "restore drives from storage" dialog, kept apart from the
 * component so it can be unit-tested in Node.
 */

const DAMAGE_HINTS: Record<string, string> = {
  META_MISSING: "Its description file is missing from the storage.",
  META_INVALID: "Its description file cannot be read.",
  OPS_GAP: "Part of its history is missing, so it cannot be restored safely.",
  OPS_CORRUPT: "Part of its history is corrupted, so it cannot be restored safely.",
  OPS_TOO_LARGE: "Its history is too large to restore.",
};

const ALREADY_EXISTS_HINT =
  "Already in the system. To use this storage for that drive, add it as a secondary storage in the drive's settings.";

/** Why a found drive cannot be selected, or null if it can. */
export function restoreBlockedHint(drive: FoundDrive): string | null {
  if (drive.status === "RESTORABLE") return null;
  if (drive.status === "ALREADY_EXISTS") return ALREADY_EXISTS_HINT;
  return (drive.reason && DAMAGE_HINTS[drive.reason]) || "It is damaged and cannot be restored.";
}

/** The title to show; a drive whose description file is unreadable has none. */
export function foundDriveLabel(drive: FoundDrive): string {
  return drive.title?.trim() || "Unnamed drive";
}

/** The first part of the id tells apart drives with the same title. */
export function shortDriveId(driveId: string): string {
  return driveId.slice(0, 8);
}

/** One line for the outcome of restoring a single drive. */
export function describeRestoreResult(result: RestoreResult): { ok: boolean; text: string } {
  switch (result.status) {
    case "RESTORED":
      return { ok: true, text: "Restored." };
    case "ALREADY_EXISTS":
      return { ok: false, text: "Already in the system, so it was not restored again." };
    case "NOT_FOUND":
      return { ok: false, text: "Not found on the storage any more." };
    case "DAMAGED":
      return { ok: false, text: (result.reason && DAMAGE_HINTS[result.reason]) || "It is damaged and cannot be restored." };
    case "FAILED":
      return {
        ok: false,
        text: result.reason === "UNREACHABLE"
          ? "The storage stopped responding. Try again."
          : result.reason === "ACCESS_DENIED"
            ? "The storage refused access while restoring."
            : "Restoring failed. Try again.",
      };
  }
}
