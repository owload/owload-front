import { AxiosError } from "axios";

/**
 * Turning a failed API call into something the user can read.
 *
 * Kept free of any browser-only import so it can be unit-tested in Node.
 */

export const STORAGE_TARGETS_UNAVAILABLE = "STORAGE_TARGETS_UNAVAILABLE";

export type StorageFailureReason = "UNREACHABLE" | "ACCESS_DENIED" | "BUCKET_NOT_FOUND" | "OTHER";

/** One failed storage. Deliberately no name and no connection parameter: only its role and why it failed. */
export interface FailedStorageTarget {
  targetId: string;
  role: string; // "MASTER" | "SLAVE"
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

interface FailureGroup {
  role: string;
  reason: string;
  count: number;
}

// The main storage first, then the secondary ones; equal (role, reason) pairs are merged.
function groupFailures(targets: FailedStorageTarget[]): FailureGroup[] {
  const groups: FailureGroup[] = [];
  for (const t of targets) {
    const existing = groups.find(g => g.role === t.role && g.reason === t.reason);
    if (existing) existing.count++;
    else groups.push({ role: t.role, reason: t.reason, count: 1 });
  }
  const rank = (role: string) => (role === "MASTER" ? 0 : role === "SLAVE" ? 1 : 2);
  return groups.sort((a, b) => rank(a.role) - rank(b.role));
}

function nounPhrase(group: FailureGroup): string {
  if (group.role === "MASTER") return "the main storage";
  const kind = group.role === "SLAVE" ? "secondary storage" : "storage";
  if (group.count === 1) return `a ${kind}`;
  return `${group.count} ${kind.replace("storage", "storages")}`;
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

function describeGroup(group: FailureGroup): string {
  const subject = nounPhrase(group);
  const plural = group.count > 1;
  const their = plural ? "their" : "its";
  switch (group.reason) {
    case "UNREACHABLE":
      return `${capitalize(subject)} ${plural ? "are" : "is"} not reachable or not responding.`;
    case "ACCESS_DENIED":
      return `Access to ${subject} was denied. Check ${their} credentials in the drive settings.`;
    case "BUCKET_NOT_FOUND":
      return `${capitalize(subject)} could not be found. Check ${their} settings.`;
    default:
      return `${capitalize(subject)} ${plural ? "returned errors" : "returned an error"}.`;
  }
}

/**
 * A short, readable explanation of why an API call failed. For a write that a
 * storage of the drive refused, says whether the main and/or secondary storages
 * are the problem and why — without naming or describing any storage; for
 * anything else falls back to the server's message, or to `fallback`.
 */
export function describeApiError(error: unknown, fallback = "The operation failed."): string {
  return describeApiErrorLines(error, fallback).join(" ");
}

/** The same explanation as {@link describeApiError}, one sentence per line (for display). */
export function describeApiErrorLines(error: unknown, fallback = "The operation failed."): string[] {
  const detail = readErrorDetail(error);

  const storage = asStorageTargetsUnavailable(detail);
  if (storage) {
    const sentences = groupFailures(storage.targets).map(describeGroup);
    if (sentences.length === 0) sentences.push("A storage of this drive is not available.");
    sentences.push(
      storage.rolledBack
        ? "Nothing was saved."
        : "Part of the data may have been left on the storages that were available."
    );
    return sentences;
  }

  if (typeof detail === "string" && detail.trim()) return [detail];

  if (error instanceof AxiosError && !error.response) {
    return ["Cannot reach the server. Check your connection and try again."];
  }
  return [fallback];
}
