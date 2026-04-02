
export function concatArrays(u8arr1: Uint8Array, u8arr2: Uint8Array): Uint8Array<ArrayBuffer> {
  const res = new Uint8Array(u8arr1.length + u8arr2.length);
  res.set(u8arr1, 0);
  res.set(u8arr2, u8arr1.length);
  return res;
}

export function checkEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
  return true;
}

export async function readToUint8Array(rs: ReadableStream<Uint8Array>, size?: number): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise<Uint8Array<ArrayBuffer>>((resolve) => {
    const ws = ToUint8WritableStream(size, resolve);
    rs.pipeTo(ws);
  });
}

function ToUint8WritableStream(
  size: number | undefined,
  resultCallback: (result: Uint8Array<ArrayBuffer>) => void
): WritableStream<Uint8Array> {
  let buffer = new Uint8Array(size || 0);
  let offset = 0;
  return new WritableStream<Uint8Array<ArrayBuffer>>({
    write(chunk) {
      if (size) {
        buffer.set(chunk, offset);
        offset += chunk.byteLength;
      } else {
        buffer = concatArrays(buffer, new Uint8Array(chunk));
      }
    },
    close() {
      resultCallback(buffer);
    },
  });
}

export function readAsStream(source: Blob | Uint8Array | string, chunkLength: number): ReadableStream<Uint8Array> {
  assertCorrectChunkLength(chunkLength);
  if (typeof source === 'string') {
    source = new TextEncoder().encode(source);
  }
  return readBlobOrUint8ArrayAsStream(source, chunkLength);
}

function assertCorrectChunkLength(chunkLength: number): void {
  if (!(chunkLength > 0)) {
    throw new Error('Incorrect chunkLength: ' + chunkLength);
  }
}

function readBlobOrUint8ArrayAsStream(source: Blob | Uint8Array, chunkLength: number): ReadableStream<Uint8Array> {
  const sourceLength = getSourceLength(source);
  const chunksCount = Math.ceil(sourceLength / chunkLength);
  let curChunkNum = 0;
  return new ReadableStream({
    async pull(controller) {
      const last = curChunkNum >= chunksCount - 1;
      const startPos = curChunkNum * chunkLength;
      const endPos = last ? sourceLength : startPos + chunkLength;
      if (endPos > startPos) {
        const content = await getSourceSliceContent(source, startPos, endPos);
        controller.enqueue(content);
      }
      if (last) {
        controller.close();
      }
      curChunkNum++;
    },
  });
}

function getSourceLength(source: Blob | Uint8Array): number {
  if (source instanceof Blob) {
    return source.size;
  } else {
    return source.length;
  }
}

async function getSourceSliceContent(source: Blob | Uint8Array, startPos: number, endPos: number): Promise<Uint8Array> {
  const slice = source.slice(startPos, endPos);
  let content;
  if (slice instanceof Blob) {
    content = new Uint8Array(await readBlob(slice));
  } else {
    content = slice;
  }
  return content;
}

export async function readBlob(blob: Blob): Promise<ArrayBuffer> {
  // Node.js doesn't support blob.arrayBuffer()
  if (blob.arrayBuffer != undefined) {
    return blob.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = async (e) => {
      if (e.target == null) {
        reject(new Error("e.target is null"));
        return;
      }
      resolve(e.target.result as ArrayBuffer);
    };
    fr.onerror = (e) => {
      console.error('error ', e);
      reject(e);
    };
    fr.readAsArrayBuffer(blob);
  });
}

// TODO: add test cases
export function readBlobAsStream(blob: Blob, chunkLength: number): ReadableStream<Uint8Array> {
  if (!(chunkLength > 0)) {
    throw new Error("Incorrect chunkLength: " + chunkLength);
  }
  const chunksCout = Math.ceil(blob.size / chunkLength)
  let curChunkNum = 0;
  return new ReadableStream({
    async pull(controller) {
      let last = curChunkNum === chunksCout - 1;
      let startPos = curChunkNum * chunkLength;
      let endPos = last ? blob.size : startPos + chunkLength;
      // TODO: consider adding progress callback if progress is needed
      // progressCallback(curChunkNum+1 + ' / ' + chunksCout)
      //const fileContent = await new Response(blob.slice(startPos, endPos)).arrayBuffer(); //await readFile(file.slice(startPos, endPos));
      const fileContent = await readBlob(blob.slice(startPos, endPos));
      controller.enqueue(new Uint8Array(fileContent));
      if (last) {
        controller.close();
      } else {
        curChunkNum++
      }
    }
  });
}

export function SkipTransformStream(skipLeftLength: number): TransformStream<Uint8Array, Uint8Array> {
  let lenBytesSkipped = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      if (chunk.length <= skipLeftLength - lenBytesSkipped) {
        lenBytesSkipped += chunk.length;
      } else if (skipLeftLength - lenBytesSkipped > 0) {
        controller.enqueue(chunk.slice(skipLeftLength - lenBytesSkipped));
        lenBytesSkipped += skipLeftLength - lenBytesSkipped;
      } else {
        controller.enqueue(chunk);
      }
    },
  });
}

export function PadTransformStream(chunkSize: number, startPos: number): TransformStream<Uint8Array, Uint8Array> {
  let buf = new Uint8Array(chunkSize);
  let bufPos: number;
  return new TransformStream<Uint8Array, Uint8Array>({
    start(controller) {
      bufPos = startPos % chunkSize;
      for (let i = 0; i < (startPos - bufPos) / chunkSize; i++) {
        controller.enqueue(buf);
        buf = new Uint8Array(chunkSize);
      }
    },
    async transform(chunk, controller) {
      let chunkPos = 0;
      while (chunkPos < chunk.byteLength) {
        const bufBytesLeft = chunkSize - bufPos;
        const chunkBytesLeft = chunk.byteLength - chunkPos;
        if (bufBytesLeft <= chunkBytesLeft) {
          buf.set(chunk.slice(chunkPos, chunkPos + bufBytesLeft), bufPos);
          chunkPos += bufBytesLeft;
          controller.enqueue(buf);
          buf = new Uint8Array(chunkSize);
          bufPos = 0;
        } else {
          buf.set(chunk.slice(chunkPos), bufPos);
          bufPos += chunkBytesLeft;
          chunkPos += chunkBytesLeft;
        }
      }
    },
    flush(controller) {
      if (bufPos > 0) {
        controller.enqueue(buf.slice(0, bufPos));
      }
    },
  });
}

export function base64ToUint8Array(base64Str: string): Uint8Array<ArrayBuffer> {
  const str = atob(base64Str);
  const buf = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    buf[i] = str.charCodeAt(i);
  }
  return buf;
}

export function uint8ArrayToBase64(ab: Uint8Array): string {
  return btoa(String.fromCharCode.apply(null, Array.from(ab)));
}
