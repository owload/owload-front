export type BlockFetcher = (byteOffset: number, byteLength: number, signal: AbortSignal) => Promise<Uint8Array>;

export interface ParallelBlockReadOptions {
  byteOffset: number;
  byteLength: number;
  blockSize: number;
  concurrency: number;
  fetchBlock: BlockFetcher;
  /** Aborts the read as a whole: the requests in flight are aborted and the stream errors. */
  signal?: AbortSignal;
}

/** The lengths of the blocks of a read: the first one reaches the next block boundary, the last one is what is left. */
export function planBlocks(byteOffset: number, byteLength: number, blockSize: number): Array<{ byteOffset: number; byteLength: number }> {
  const blocks: Array<{ byteOffset: number; byteLength: number }> = [];
  let done = 0;
  while (done < byteLength) {
    const pos = byteOffset + done;
    const len = Math.min(blockSize - (pos % blockSize), byteLength - done);
    blocks.push({ byteOffset: pos, byteLength: len });
    done += len;
  }
  return blocks;
}

/**
 * Reads a byte range as a stream of blocks, asking the server for several blocks at once and handing them out in order.
 * The next block is requested as soon as a slot frees, and never more than `concurrency` blocks are held, so memory is bounded.
 * A failed block fails the stream (after the requests of the block's turn), and cancelling the stream aborts the requests in flight.
 */
export function readBlocksInParallel(options: ParallelBlockReadOptions): ReadableStream<Uint8Array> {
  const { fetchBlock, concurrency, signal } = options;
  if (!(concurrency >= 1)) throw new Error('Incorrect concurrency: ' + concurrency);
  const blocks = planBlocks(options.byteOffset, options.byteLength, options.blockSize);
  const abort = new AbortController();
  const inFlight: Array<Promise<Uint8Array>> = [];
  let next = 0;

  const onOuterAbort = () => abort.abort(signal?.reason);
  if (signal) {
    if (signal.aborted) abort.abort(signal.reason);
    else signal.addEventListener('abort', onOuterAbort, { once: true });
  }
  const cleanUp = () => signal?.removeEventListener('abort', onOuterAbort);

  const launch = () => {
    while (inFlight.length < concurrency && next < blocks.length) {
      const block = blocks[next++];
      const promise = fetchBlock(block.byteOffset, block.byteLength, abort.signal).then((data) => {
        if (data.byteLength !== block.byteLength) {
          throw new Error(`Server responded with wrong data length. Requested: ${block.byteLength}, returned: ${data.byteLength}`);
        }
        return data;
      });
      promise.catch(() => undefined); // it is awaited in its turn; this only keeps an early failure from being reported as unhandled
      inFlight.push(promise);
    }
  };

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (abort.signal.aborted) {
        cleanUp();
        throw abort.signal.reason ?? new DOMException('Aborted', 'AbortError');
      }
      launch();
      const head = inFlight.shift();
      if (!head) {
        cleanUp();
        controller.close();
        return;
      }
      try {
        controller.enqueue(await head);
      } catch (e) {
        abort.abort(e);
        cleanUp();
        throw e;
      }
      launch(); // the slot of the block just taken is free: start the next one without waiting for the consumer
    },
    cancel(reason) {
      abort.abort(reason);
      cleanUp();
    },
  });
}
