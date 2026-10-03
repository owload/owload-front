import { AxiosError } from "axios";

/**
 * Turning a failed API call into something the user can read.
 *
 * Kept free of any browser-only import so it can be unit-tested in Node.
 */

export const STORAGE_TARGETS_UNAVAILABLE = "STORAGE_TARGETS_UNAVAILABLE";

export type StorageFailureReason = "UNREACHABLE" | "ACCESS_DENIED" | "BUCKET_NOT_FOUND" | "OTHER";

export interface FailedStorageTarget {
  targetId: string;
  role: string;
  label: string;
  reason: StorageFailureReason | string;
}

/** The body of a write that failed on one or more of a drive's storages (HTTP 502). */
export interface StorageTargetsUnavailableDetail {
  code: typeof STORAGE_TARGETS_UNAVAILABLE;
  message: string;
  targets: FailedStorageTarget[];
  rolledBack: boolean;
}

/**
 * The `detail` of an error response, parsed. Responses of calls made with
 * `responseType: "arraybuffer"` (data blocks) or `"text"` carry the error body
 * as bytes/text instead of an object, so it is decoded here.
 */
export function readErrorDetail(error: unknown): unknown {
  if (!(error instanceof AxiosError) || !error.response) return undefined;
  let data: unknown = error.response.data;
  try {
    if (data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
      data = new TextDecoder().decode(data as ArrayBuffer);
    }
    if (typeof data === "string") {
      data = JSON.parse(data);
    }
  } catch {
    return undefined; // not JSON (for example an HTML page from a proxy): never show it to the user
  }
  if (data && typeof data === "object" && "detail" in data) {
    return (data as { detail: unknown }).detail;
  }
  return undefined;
}

export function asStorageTargetsUnavailable(detail: unknown): StorageTargetsUnavailableDetail | null {
  if (
    detail && typeof detail === "object" &&
    (detail as { code?: unknown }).code === STORAGE_TARGETS_UNAVAILABLE &&
    Array.isArray((detail as { targets?: unknown }).targets)
  ) {
    return detail as StorageTargetsUnavailableDetail;
  }
  return null;
}

export function isStorageUnavailableError(error: unknown): boolean {
  return asStorageTargetsUnavailable(readErrorDetail(error)) !== null;
}

// The backend says MASTER/SLAVE; users see main/secondary (decisions/0015).
function roleWord(role: string): string {
  if (role === "MASTER") return "main";
  if (role === "SLAVE") return "secondary";
  return role.toLowerCase();
}

function describeFailedTarget(target: FailedStorageTarget): string {
  const name = `"${target.label || "Storage"}"${target.role ? ` (${roleWord(target.role)})` : ""}`;
  switch (target.reason) {
    case "UNREACHABLE":
      return `Storage ${name} is not reachable or not responding.`;
    case "ACCESS_DENIED":
      return `Access to storage ${name} was denied. Check its credentials in the drive settings.`;
    case "BUCKET_NOT_FOUND":
      return `The bucket of storage ${name} was not found. Check its settings.`;
    default:
      return `Storage ${name} returned an error.`;
  }
}

/**
 * A short, readable explanation of why an API call failed. For a write that a
 * storage of the drive refused, names every failed storage and the reason; for
 * anything else falls back to the server's message, or to `fallback`.
 */
export function describeApiError(error: unknown, fallback = "The operation failed."): string {
  const detail = readErrorDetail(error);

  const storage = asStorageTargetsUnavailable(detail);
  if (storage) {
    const sentences = storage.targets.map(describeFailedTarget);
    if (sentences.length === 0) sentences.push("A storage of this drive is not available.");
    sentences.push(
      storage.rolledBack
        ? "Nothing was saved."
        : "Part of the data may have been left on the storages that were available."
    );
    return sentences.join(" ");
  }

  if (typeof detail === "string" && detail.trim()) return detail;

  if (error instanceof AxiosError && !error.response) {
    return "Cannot reach the server. Check your connection and try again.";
  }
  return fallback;
}
