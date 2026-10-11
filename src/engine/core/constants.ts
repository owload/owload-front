export const BLOCK_SIZE = 1 * 1024 * 1024;

/** How many blocks are read from the server at once (decision 0031). More hides the round trip better and costs memory (this many blocks) and requests. */
export const BLOCK_READ_CONCURRENCY = 6;

/** How many blocks are written to the server at once. A write also copies to every storage of the drive, so it is kept below the read window. */
export const BLOCK_WRITE_CONCURRENCY = 4;

/** How long one block may take before the request is given up and retried. A block shares the line with the others in flight, so a slow line needs minutes, not seconds. */
export const DATA_BLOCK_TIMEOUT_MS = 120_000;
