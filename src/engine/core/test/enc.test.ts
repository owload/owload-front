import {
  AesEncryptor,
  createEncryptingStream,
  encrypt,
  Encryptor,
  generateKey,
  getCounter,
  getRandomNonce,
  MockEncryptor
} from '../enc';
import {checkEqual, concatArrays, readAsStream, readToUint8Array} from '../stream-utils';
import { assert, expect, test } from 'vitest';

const defaultPassword = 'Some secret key';
const defaultSalt = getRandomNonce();
const defaultTestCounterNonce = getRandomNonce();

const testString =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent sed augue arcu. Donec faucibus ultrices auctor. Nunc porttitor ipsum et risus aliquet blandit. Nunc viverra massa eu enim elementum posuere. Mauris ut malesuada elit, in malesuada risus. Sed scelerisque libero ullamcorper dolor eleifend laoreet sit amet ac orci. Curabitur aliquam elit sed nisi tempor, vitae efficitur ligula eleifend. Maecenas porta fringilla metus, quis rhoncus lectus accumsan a.';

// TODO: remove %16 magic const

function testCounter(nonce: Uint8Array, iteration: number, expected: Uint8Array) {
  const received = getCounter(nonce, iteration);
  expect(checkEqual(received, expected)).toBe(true);
}

test('getCounter', () => {
  const testCases = [
    {
      iteration: 0,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 0],
    },
    {
      iteration: 1,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 1],
    },
    {
      iteration: 255,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 255],
    },
    {
      iteration: 256,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 1, 0],
    },
    {
      iteration: 259,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 1, 3],
    },
    {
      iteration: 256 * 256 + 1,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 255],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 1, 1, 0],
    },
    {
      iteration: 256 * 256 + 255,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 0, 255],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 1, 1, 254],
    },
    {
      iteration: 256 * 256 + 255,
      nonceBytes: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 0, 255, 255],
      expectedBs: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 0, 2, 0, 254],
    },
    {
      iteration: 1,
      nonceBytes: [1, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
      expectedBs: [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      iteration: 1,
      nonceBytes: [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
      expectedBs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      iteration: 255,
      nonceBytes: [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
      expectedBs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 254],
    },
    {
      iteration: 256,
      nonceBytes: [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
      expectedBs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 255],
    },
    {
      iteration: 256 + 2,
      nonceBytes: [255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
      expectedBs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1],
    },
    {
      iteration: 0,
      nonceBytes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      expectedBs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
    {
      iteration: 256 * 256 * 256 * 4 + 256 * 256 * 255 + 256 * 100 + 123,
      nonceBytes: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      expectedBs: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 255, 100, 123],
    },

    //TODO: add cases when iteration and pos overflow 4 bytes
  ];
  for (const testCase of testCases) {
    testCounter(new Uint8Array(testCase.nonceBytes), testCase.iteration, new Uint8Array(testCase.expectedBs));
  }
});

async function getTestKeyEncoded(password?: string, salt?: Uint8Array): Promise<CryptoKey> {
  return generateKey(password || defaultPassword, salt || defaultSalt);
}

async function oneChunkEncrypt(message: Uint8Array, keyEncoded: CryptoKey, nonce: Uint8Array): Promise<Uint8Array> {
  const counter = getCounter(nonce, 0);
  const cypher = await crypto.subtle.encrypt(
    {
      name: 'AES-CTR',
      counter,
      length: 64,
    },
    keyEncoded,
    message
  );
  return new Uint8Array(cypher);
}

test('AesCtrTransformStream: encrypt and decrypt string message with same pass and nonce', async () => {
  // TODO: check optimal salt and nonce length
  const encryptedMessage = await encrypt(testString, await getTestKeyEncoded(), defaultTestCounterNonce);
  expect(encryptedMessage.length).toBe(testString.length);
  const decryptedMessage = new TextDecoder().decode(
    await encrypt(encryptedMessage, await getTestKeyEncoded(), defaultTestCounterNonce)
  );
  expect(decryptedMessage).toBe(testString);
});

test('AesCtrTransformStream: compare stream encryption result with one-chunk encryption with string', async () => {
  const streamEncryptedMessage = await encrypt(testString, await getTestKeyEncoded(), defaultTestCounterNonce, 128);
  const oneChunkEncryptedMessage = await oneChunkEncrypt(
    new TextEncoder().encode(testString),
    await getTestKeyEncoded(),
    defaultTestCounterNonce
  );
  expect(checkEqual(streamEncryptedMessage, oneChunkEncryptedMessage)).toBe(true);
});

function getRandomArray(len: number): Array<number> {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(Math.floor(Math.random() * 256));
  }
  return arr;
}

test('AesCtrTransformStream: compare stream encryption result with one-chunk encryption with random byte array', async () => {
  const originalMessage = new Uint8Array(getRandomArray(100203));
  const streamEncryptedMessage = await encrypt(
    originalMessage,
    await getTestKeyEncoded(),
    defaultTestCounterNonce,
    128
  );
  const oneChunkEncryptedMessage = await oneChunkEncrypt(
    originalMessage,
    await getTestKeyEncoded(),
    defaultTestCounterNonce
  );
  expect(checkEqual(streamEncryptedMessage, oneChunkEncryptedMessage)).toBe(true);
});

test('AesCtrTransformStream: decrypt from arbitrary pos for string', async () => {
  const encryptedMessage = await encrypt(testString, await getTestKeyEncoded(), defaultTestCounterNonce, 128);
  const decoder = new TextDecoder();
  for (const pos of [1, 2, 3, 4, 6, 7, 9, 10, 11, 13, 15, 17, 20, 22, 43, 46, 94, 128, 129, 130]) {
    const decryptedMessage = decoder.decode(
      await encrypt(encryptedMessage.slice(pos), await getTestKeyEncoded(), defaultTestCounterNonce, 32, pos, 256)
    );
    expect(decryptedMessage).toBe(testString.substring(pos));
  }
});

test('AesCtrTransformStream: decrypt from arbitrary pos for random array', async () => {
  const originalMessage = new Uint8Array(getRandomArray(350));
  const chunkBreaks = getRandomArray(20);
  const encryptedMessage = await encrypt(originalMessage, await getTestKeyEncoded(), defaultTestCounterNonce, 1024);
  for (const pos of chunkBreaks) {
    const decryptedMessage = await encrypt(
      encryptedMessage.slice(pos),
      await getTestKeyEncoded(),
      defaultTestCounterNonce,
      128,
      pos,
      256
    );
    expect(checkEqual(decryptedMessage, originalMessage.slice(pos))).toBe(true);
  }
});

function splitToChunks<T extends string | Uint8Array>(strOrArr: T, chunkBreaks: number[]): T[] {
  const chunks: T[] = [];
  let i;
  for (i = 1; i < chunkBreaks.length; i++) {
    chunks.push(strOrArr.slice(chunkBreaks[i - 1], chunkBreaks[i]) as T);
  }
  if (typeof strOrArr === 'string') {
    assert(chunks.join('') === strOrArr);
  }
  return chunks;
}

test('AesCtrTransformStream: arbitrary pos encryption', async () => {
  const chunkBreaks = [0, 12, 122, 128, 200, 201, 259, 400, 432, 434, testString.length];
  const chunks = splitToChunks(testString, chunkBreaks);
  const oneChunkEncryptedMessage = await oneChunkEncrypt(
    new TextEncoder().encode(testString),
    await getTestKeyEncoded(),
    defaultTestCounterNonce
  );
  let res = new Uint8Array(0);
  for (let i = 0; i < chunkBreaks.length - 1; i++) {
    const encryptedChunk = await encrypt(
      chunks[i],
      await getTestKeyEncoded(),
      defaultTestCounterNonce,
      128,
      chunkBreaks[i],
      128
    );
    res = concatArrays(res, encryptedChunk);
  }
  expect(checkEqual(res, oneChunkEncryptedMessage)).toBe(true);
});

test('AesCtrTransformStream: encrypt multiple chunks, combine and decrypt', async () => {
  const chunks = [
    '[1,"/12345"]',
    '[1,"/12345/12345"]',
    '[5,"/12345/12345/IMG_8167.MOV",0,2484480]',
    '[6,0]',
    '[5,"/12345/12345/IMG_8165.MOV",19555953,5690491]',
    '[6,19555953]',
  ];
  let curPos = 0;
  const nonce = await getRandomNonce();
  const key = await getTestKeyEncoded('Different-password-for-data', nonce);
  let chunksEncrypted = new Uint8Array(0);
  for (const chunk of chunks) {
    const encryptedChunk = await encrypt(chunk, key, nonce, 1024, curPos, 16);
    curPos += chunk.length;
    chunksEncrypted = concatArrays(chunksEncrypted, encryptedChunk);
  }
  const decryptedMessage = await encrypt(chunksEncrypted, key, nonce);
  expect(new TextDecoder().decode(decryptedMessage)).toBe(chunks.join(''));
});

// TODO
test("AesCtrTransformStream: wrong password doesn't decrypt", async () => {});

test("AesCtrTransformStream: wrong key salt doesn't decrypt", async () => {});

test("AesCtrTransformStream: wrong counter nonce doesn't decrypt", async () => {});

async function getEncryptorDecryptor<T extends Uint8Array | Blob | string>(
  nonce: Uint8Array,
  encInputChunkLength?: number,
  encPadChunkLength?: number,
  decInputChunkLength?: number,
  decPadChunkLength?: number
) {
  const keyEncoded = await generateKey(defaultPassword, defaultSalt);
  const encryptor = new AesEncryptor<T>(keyEncoded, nonce, encInputChunkLength, encPadChunkLength);
  const decryptor = new AesEncryptor<T>(keyEncoded, nonce, decInputChunkLength, decPadChunkLength);
  return [encryptor, decryptor];
}

test('AesEncryptor: string one-chunk encryption-decryption', async () => {
  const [encryptor, decryptor] = await getEncryptorDecryptor<string>(defaultTestCounterNonce, 128, 32);
  const encryptedBytes = await encryptor.encrypt(testString);
  const decryptedBytes = await decryptor.decrypt(encryptedBytes);
  const decryptedString = new TextDecoder().decode(decryptedBytes);
  expect(decryptedString).toBe(testString);
});

test('AesEncryptor: Uint8Array one-chunk encryption-decryption', async () => {
  const [encryptor, decryptor] = await getEncryptorDecryptor<Uint8Array>(defaultTestCounterNonce);

  const originalMessage = new Uint8Array(getRandomArray(350));
  const encryptedBytes = await encryptor.encrypt(originalMessage);
  const decryptedBytes = await decryptor.decrypt(encryptedBytes);
  expect(checkEqual(originalMessage, decryptedBytes)).toBe(true);
});

async function multiChunkStringEncDec(
  originalString: string,
  encryptor: Encryptor<string>,
  decryptor: Encryptor<string>
): Promise<string> {
  const encChunkBreaks = [0, 0, 1, 54, 100, 128, 200, 293, 300, 301, 302, 302, 304, 307, originalString.length];
  const chunks = splitToChunks(originalString, encChunkBreaks);

  let encryptedBytes = new Uint8Array(0);
  for (const chunk of chunks) {
    const encryptedChunk = await encryptor.encrypt(chunk);
    encryptedBytes = concatArrays(encryptedBytes, encryptedChunk);
  }

  const decChunkBreaks = [0, 0, 0, 1, 1, 1, 28, 29, 200, 294, 401, encryptedBytes.length];
  const encryptedChunks = splitToChunks(encryptedBytes, decChunkBreaks);
  let decryptedBytes = new Uint8Array(0);
  for (const chunk of encryptedChunks) {
    const decryptedChunk = await decryptor.decrypt(chunk);
    decryptedBytes = concatArrays(decryptedBytes, decryptedChunk);
  }
  return new TextDecoder().decode(decryptedBytes);
}

test('AesEncryptor: multi-chunk string encryption-decryption', async () => {
  const [encryptor, decryptor] = await getEncryptorDecryptor<string>(defaultTestCounterNonce, 16, 32, 64, 16);
  const decryptedString = await multiChunkStringEncDec(testString, encryptor, decryptor);
  expect(decryptedString).toBe(testString);
});

test('MockEncryptor: multi-chunk string encryption-decryption', async () => {
  const encryptor = new MockEncryptor();
  const decryptor = encryptor;
  const decryptedString = await multiChunkStringEncDec(testString, encryptor, decryptor);
  expect(decryptedString).toBe(testString);
});

test('AesEncryptor: concurrent encryption', async () => {
  const [encryptor, decryptor] = await getEncryptorDecryptor<string>(defaultTestCounterNonce, 16, 32, 64, 16);
  const N = 50;
  const str = '12345';
  const promises = [];
  for (let i = 0; i < N; i++) {
    promises.push(encryptor.encrypt(str));
  }
  const encryptedU8Arrays = await Promise.all(promises);
  let res = '';
  const decoder = new TextDecoder();
  for (let i = 0; i < N; i++) {
    res += decoder.decode(await decryptor.decrypt(encryptedU8Arrays[i]));
  }
  let expected = '';
  for (let i = 0; i < N; i++) {
    expected += str;
  }
  expect(res).toBe(expected);
});

test('Padding test', async () => {
  const data = "asdfas034034 adskfjasdkfjpiwqoije,zzmcxvmADfa";
  const key = await generateKey(defaultPassword, defaultSalt);
  const rs = readAsStream(data, 44);
  const enc = createEncryptingStream(rs, key, defaultTestCounterNonce, 0, 32);
  await readToUint8Array(enc);
});

// TODO: test with BLOB
