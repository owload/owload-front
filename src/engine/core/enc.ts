import { PadTransformStream, readAsStream, readBlob, readToUint8Array, SkipTransformStream } from './stream-utils';

//TODO: IMPORTANT use different nonce for ops and data encryption

export function write() {
  console.log('message from module');
}

export const ENCRYPTION_BLOCK_BYTE_LENGTH = 128 / 8; // Standard for AES is 128 bits (16 bytes)
const ENCRYPTION_KEY_BYTE_LENGTH = 256 / 8; // 128, 192 or 256 bits
const CRYPTO_KEY_DERIVATION_ITERATIONS_COUNT = 1e5;
const CRYPTO_KEY_DERIVATION_PBKDF_HASH_ALG: 'SHA-256' | 'SHA-384' | 'SHA-512' = 'SHA-512';

export type EncryptionProgressCallback = (progress: number) => void;

export function getRandomNonce(nonceByteLength: number = ENCRYPTION_BLOCK_BYTE_LENGTH): Uint8Array {
  const u8arr = new Uint8Array(nonceByteLength);
  return crypto.getRandomValues(u8arr);
}

export function AesCtrTransformStream(
  keyEncoded: CryptoKey,
  nonce: Uint8Array,
  startIteration: number,
  progressCallback?: EncryptionProgressCallback
): TransformStream<Uint8Array, Uint8Array> {
  let iteration = 0;
  let bytesProcessed = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    async transform(chunk, controller) {
      if (!Number.isInteger(iteration)) {
        throw new Error('Incorrect padding ' + iteration);
      }
      const chunkLen = chunk.byteLength;
      const counter = getCounter(nonce, startIteration + iteration);
      /*
        Number of bits in the counter block that are used for the actual counter.
        Half of the counter block following NIST SP800-38A standard
      */
      const ACTUAL_COUNTER_BIT_LENGTH = (ENCRYPTION_BLOCK_BYTE_LENGTH * 8) / 2;
      const cypher = await crypto.subtle.encrypt(
        {
          name: 'AES-CTR',
          counter,
          length: ACTUAL_COUNTER_BIT_LENGTH,
        },
        keyEncoded,
        chunk
      );
      controller.enqueue(new Uint8Array(cypher));
      iteration += chunkLen / ENCRYPTION_BLOCK_BYTE_LENGTH;
      if (progressCallback !== undefined) {
        bytesProcessed += chunkLen;
        progressCallback(bytesProcessed);
      }
    },
  });
}

export function getCounter(nonce: Uint8Array, iteration: number): Uint8Array {
  const counter = new Uint8Array(ENCRYPTION_BLOCK_BYTE_LENGTH);
  counter.set(nonce);
  let byteMask = 0xff;
  let bytesDiv = 0x1;
  let carryFlag = 0;
  for (let i = ENCRYPTION_BLOCK_BYTE_LENGTH - 1; i >= 0; i--) {
    let sum = counter[i] + (iteration & byteMask) / bytesDiv + carryFlag;
    if (sum >= 0x100) {
      sum -= 0x100;
      carryFlag = 1;
    } else {
      carryFlag = 0;
    }
    counter[i] = sum;
    byteMask *= 0x100;
    bytesDiv *= 0x100;
  }
  return counter;
}

export async function generateKey(password: string, salt: Uint8Array, extractable = false): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', getMessageEncoding(password), 'PBKDF2', false, [
    'deriveBits',
    'deriveKey',
  ]);
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: CRYPTO_KEY_DERIVATION_ITERATIONS_COUNT,
      hash: CRYPTO_KEY_DERIVATION_PBKDF_HASH_ALG,
    },
    keyMaterial,
    { name: 'AES-CTR', length: ENCRYPTION_KEY_BYTE_LENGTH * 8 },
    extractable,
    ['encrypt', 'decrypt']
  );
}

function getMessageEncoding(message: string): Uint8Array {
  const enc = new TextEncoder();
  return enc.encode(message);
}


export function createEncryptingStream(input: ReadableStream<Uint8Array>,
  keyEncoded: CryptoKey,
  nonce: Uint8Array,
  posStart: number = 0,
  padChunkLength: number = 32,
  progressCallback?: EncryptionProgressCallback): ReadableStream<Uint8Array> {
  const encStream = AesCtrTransformStream(keyEncoded, nonce, Math.floor((posStart - posStart % padChunkLength) / ENCRYPTION_BLOCK_BYTE_LENGTH), progressCallback);
  const padStream = PadTransformStream(padChunkLength, posStart % padChunkLength);
  const skipStream = SkipTransformStream(posStart % padChunkLength);
  return input.pipeThrough(padStream).pipeThrough(encStream).pipeThrough(skipStream);
}

export async function encrypt(
  message: Uint8Array | Blob | string,
  keyEncoded: CryptoKey,
  nonce: Uint8Array,
  inputChunkLength = 32,
  posStart: number = 0,
  padChunkLength: number = 32
): Promise<Uint8Array> {
  validatePaddingParams(inputChunkLength, posStart, padChunkLength);
  let readableStream = readAsStream(message, inputChunkLength);
  return readToUint8Array(createEncryptingStream(readableStream, keyEncoded, nonce, posStart, padChunkLength));
}

function validatePaddingParams(inputChunkLength: number, posStart: number, padChunkLength: number): void {
  if (!posStart && inputChunkLength % ENCRYPTION_BLOCK_BYTE_LENGTH !== 0) {
    throw new Error(`Incorrect inputChunkLength ${inputChunkLength} with posStart ${posStart}`);
  }
  if (posStart && (!padChunkLength || padChunkLength % ENCRYPTION_BLOCK_BYTE_LENGTH !== 0)) {
    throw new Error(`Incorrect padChunkLength ${padChunkLength} with posStart ${posStart}`);
  }
}

export abstract class Encryptor<T extends Uint8Array | Blob | string> {
  public abstract encrypt(message: T, startPosition?: number): Promise<Uint8Array>;
  public abstract decrypt(
    message: Uint8Array,
    startPosition?: number
  ): Promise<Uint8Array>;
}

export class AesEncryptor<T extends Uint8Array | Blob | string> implements Encryptor<T> {
  private readonly nonce: Uint8Array;
  private readonly inputChunkLength: number;
  private readonly padChunkLength: number;
  private keyEncoded: CryptoKey;
  private position = 0;

  constructor(keyEncoded: CryptoKey, nonce: Uint8Array, inputChunkLength: number = 32, padChunkLength: number = 32) {
    this.keyEncoded = keyEncoded;
    this.nonce = nonce;
    this.inputChunkLength = inputChunkLength;
    this.padChunkLength = padChunkLength;
  }

  private getMessageByteLength(message: T) {
    if (typeof message === 'string') {
      return new TextEncoder().encode(message).length;
    } else if (message instanceof Blob) {
      return message.size;
    } else if (message instanceof Uint8Array) {
      return message.length;
    } else {
      throw new Error('Unsupported message type');
    }
  }

  async encrypt(message: T, startPosition: number | undefined = undefined): Promise<Uint8Array> {
    if (startPosition !== undefined) {
      this.position = startPosition;
    }
    const curPosition = this.position;
    this.position += this.getMessageByteLength(message);
    const res = await encrypt(
      message,
      this.keyEncoded,
      this.nonce,
      this.inputChunkLength,
      curPosition,
      this.padChunkLength
    );
    return res;
  }

  async decrypt(message: Uint8Array, startPosition: number | undefined = undefined): Promise<Uint8Array> {
    if (startPosition !== undefined) {
      this.position = startPosition;
    }
    const res = await encrypt(
      message,
      this.keyEncoded,
      this.nonce,
      this.inputChunkLength,
      this.position,
      this.padChunkLength
    );
    this.position += message.length;
    return res;
  }
}

export class MockEncryptor<T extends Uint8Array | Blob | string> implements Encryptor<T> {
  async encrypt(message: T): Promise<Uint8Array> {
    if (typeof message === 'string') {
      return new TextEncoder().encode(message);
    } else if (message instanceof Blob) {
      return new Uint8Array(await readBlob(message));
    } else if (message instanceof Uint8Array) {
      return message;
    } else {
      throw new Error('Unsupported message type');
    }
  }

  async decrypt(message: Uint8Array): Promise<Uint8Array> {
    return message;
  }
}
