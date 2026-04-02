import {
  base64ToUint8Array,
  checkEqual,
  concatArrays,
  PadTransformStream,
  readAsStream,
  readToUint8Array,
  SkipTransformStream,
  uint8ArrayToBase64,
} from '../stream-utils';
import { assert, expect, test } from 'vitest';

test('checkEqual for equal arrays is true', () => {
  expect(checkEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true);
});

test('checkEqual for equal arrays is true', () => {
  expect(checkEqual(new Uint8Array([1]), new Uint8Array([1]))).toBe(true);
});

test('checkEqual for equal arrays is true', () => {
  expect(checkEqual(new Uint8Array([]), new Uint8Array([]))).toBe(true);
});

test('checkEqual for equal arrays is true', () => {
  expect(checkEqual(new Uint8Array([255, 256, -1]), new Uint8Array([255, 0, 255]))).toBe(true);
});

test('checkEqual for unequal arrays is false', () => {
  expect(checkEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false);
});

test('checkEqual for unequal arrays is false', () => {
  expect(checkEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2]))).toBe(false);
});

test('checkEqual for unequal arrays is false', () => {
  expect(checkEqual(new Uint8Array([2, 1]), new Uint8Array([1, 2]))).toBe(false);
});

test('checkEqual for unequal arrays is false', () => {
  expect(checkEqual(new Uint8Array([]), new Uint8Array([1, 2]))).toBe(false);
});

test('checkEqual for unequal arrays is false', () => {
  expect(checkEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7]), new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBe(false);
});

test('concat uint8 arrays', () => {
  expect(checkEqual(concatArrays(new Uint8Array([]), new Uint8Array([])), new Uint8Array([]))).toBe(true);
});

test('concat uint8 arrays', () => {
  expect(checkEqual(concatArrays(new Uint8Array([1]), new Uint8Array([])), new Uint8Array([1]))).toBe(true);
});

test('concat uint8 arrays', () => {
  expect(checkEqual(concatArrays(new Uint8Array([]), new Uint8Array([255])), new Uint8Array([255]))).toBe(true);
});

test('concat uint8 arrays', () => {
  expect(
    checkEqual(
      concatArrays(new Uint8Array([1, 2, 3, 4]), new Uint8Array([5, 6, 7, 8])),
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
    )
  ).toBe(true);
});

test('concat uint8 arrays', () => {
  expect(
    checkEqual(
      concatArrays(new Uint8Array([1, 2, 3, 4, 5]), new Uint8Array([5, 6, 7, 8])),
      new Uint8Array([1, 2, 3, 4, 5, 5, 6, 7, 8])
    )
  ).toBe(true);
});

test('concat uint8 arrays', () => {
  expect(
    checkEqual(concatArrays(new Uint8Array([1]), new Uint8Array([5, 6, 7, 8])), new Uint8Array([1, 5, 6, 7, 8]))
  ).toBe(true);
});

function getRandomArray(len: number): Array<number> {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(Math.floor(Math.random() * 256));
  }
  return arr;
}

test('concat uint8 long arrays', () => {
  const len = 100090;
  const arr1 = getRandomArray(len),
    arr2 = getRandomArray(len);
  expect(checkEqual(concatArrays(new Uint8Array(arr1), new Uint8Array(arr2)), new Uint8Array([...arr1, ...arr2]))).toBe(
    true
  );
});

test('readToUint8Array with size', async () => {
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
  const res = await readToUint8Array(rs, 0);
  expect(checkEqual(res, new Uint8Array([]))).toBe(true);
});

test('readToUint8Array with size', async () => {
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([4]));
      controller.close();
    },
  });
  const res = await readToUint8Array(rs, 1);
  expect(checkEqual(res, new Uint8Array([4]))).toBe(true);
});

test('readToUint8Array with size', async () => {
  const l1 = [4];
  const l2: number[] = [];
  const l3 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255];
  const l4 = [4];
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(l1));
      controller.enqueue(new Uint8Array(l2));
      controller.enqueue(new Uint8Array(l3));
      controller.enqueue(new Uint8Array(l4));
      controller.close();
    },
  });
  const res = await readToUint8Array(rs, l1.length + l2.length + l3.length + l4.length);
  expect(checkEqual(res, new Uint8Array([...l1, ...l2, ...l3, ...l4]))).toBe(true);
});

test('readToUint8Array with size', async () => {
  const l1: number[] = [];
  const l2: number[] = [];
  const l3 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 255];
  const l4 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 255];
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(l1));
      controller.enqueue(new Uint8Array(l2));
      controller.enqueue(new Uint8Array(l3));
      controller.enqueue(new Uint8Array(l4));
      controller.close();
    },
  });
  const res = await readToUint8Array(rs, l1.length + l2.length + l3.length + l4.length);
  expect(checkEqual(res, new Uint8Array([...l1, ...l2, ...l3, ...l4]))).toBe(true);
});

test('readToUint8Array without size', async () => {
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
  const res = await readToUint8Array(rs);
  expect(checkEqual(res, new Uint8Array([]))).toBe(true);
});

test('readToUint8Array without size', async () => {
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([4]));
      controller.close();
    },
  });
  const res = await readToUint8Array(rs);
  expect(checkEqual(res, new Uint8Array([4]))).toBe(true);
});

test('readToUint8Array without size', async () => {
  const l1 = [4];
  const l2: number[] = [];
  const l3 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255];
  const l4 = [4];
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(l1));
      controller.enqueue(new Uint8Array(l2));
      controller.enqueue(new Uint8Array(l3));
      controller.enqueue(new Uint8Array(l4));
      controller.close();
    },
  });
  const res = await readToUint8Array(rs);
  expect(checkEqual(res, new Uint8Array([...l1, ...l2, ...l3, ...l4]))).toBe(true);
});

test('readToUint8Array without size', async () => {
  const l1: number[] = [];
  const l2: number[] = [];
  const l3 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 255];
  const l4 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 255];
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(l1));
      controller.enqueue(new Uint8Array(l2));
      controller.enqueue(new Uint8Array(l3));
      controller.enqueue(new Uint8Array(l4));
      controller.close();
    },
  });
  const res = await readToUint8Array(rs);
  expect(checkEqual(res, new Uint8Array([...l1, ...l2, ...l3, ...l4]))).toBe(true);
});

test('readToUint8Array without size', async () => {
  const l1: number[] = [];
  const l2: number[] = [];
  const l3 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 255];
  const l4 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 255, 255, 255, 255, 255, 255, 255, 255];
  const rs = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array(l1));
      controller.enqueue(new Uint8Array(l2));
      controller.enqueue(new Uint8Array(l3));
      controller.enqueue(new Uint8Array(l4));
      controller.close();
    },
  });
  const res = await readToUint8Array(rs);
  expect(checkEqual(res, new Uint8Array([...l1, ...l2, ...l3, ...l4]))).toBe(true);
});

function getStreamReaderOfBytes(bytes: Array<number>, chunkLength: number, mode: 'BLOB' | 'UINT8ARRAY') {
  let blobOrUint8Array: Blob | Uint8Array;
  if (mode === 'BLOB') {
    blobOrUint8Array = new Blob([new Uint8Array(bytes).buffer]);
  } else if (mode === 'UINT8ARRAY') {
    blobOrUint8Array = new Uint8Array(bytes);
  } else {
    throw new Error('Incorrect mode: ' + mode);
  }
  const rs = readAsStream(blobOrUint8Array, chunkLength);
  return rs.getReader();
}

async function testBlobOrUint8ArrayAsStream(
  bytes: Array<number>,
  chunkLength: number,
  expectedOutputArrays: Array<Array<number>>,
  mode: 'BLOB' | 'UINT8ARRAY'
): Promise<void> {
  const reader = getStreamReaderOfBytes(bytes, chunkLength, mode);
  let readRes;
  for (const arr of expectedOutputArrays) {
    readRes = await reader.read();
    assert(readRes.value !== undefined);
    expect(checkEqual(readRes.value, new Uint8Array(arr))).toBe(true);
  }
  readRes = await reader.read();
  expect(readRes.done).toBe(true);
}

async function testBothBlobOrUint8ArrayAsStream(
  bytes: Array<number>,
  chunkLength: number,
  expectedOutputArrays: Array<Array<number>>
): Promise<void> {
  await testBlobOrUint8ArrayAsStream(bytes, chunkLength, expectedOutputArrays, 'BLOB');
  await testBlobOrUint8ArrayAsStream(bytes, chunkLength, expectedOutputArrays, 'UINT8ARRAY');
}

test('readAsStream empty', async () => {
  await testBothBlobOrUint8ArrayAsStream([], 1, []);
  await testBothBlobOrUint8ArrayAsStream([], 2, []);
  await testBothBlobOrUint8ArrayAsStream([], 10, []);
  await testBothBlobOrUint8ArrayAsStream([], 1000, []);
  await testBothBlobOrUint8ArrayAsStream([], 1024 * 1024, []);
});

test('readAsStream', async () => {
  await testBothBlobOrUint8ArrayAsStream([1], 1, [[1]]);
  await testBothBlobOrUint8ArrayAsStream([1], 2, [[1]]);
  await testBothBlobOrUint8ArrayAsStream([1], 233, [[1]]);
});

test('readAsStream', async () => {
  await testBothBlobOrUint8ArrayAsStream([1, 2], 1, [[1], [2]]);
  await testBothBlobOrUint8ArrayAsStream([1, 2], 2, [[1, 2]]);
  await testBothBlobOrUint8ArrayAsStream([1, 2], 233008, [[1, 2]]);
});

test('readAsStream', async () => {
  await testBothBlobOrUint8ArrayAsStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 1, [[1], [2], [3], [4], [5], [6], [7], [8], [9]]);
  await testBothBlobOrUint8ArrayAsStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 2, [[1, 2], [3, 4], [5, 6], [7, 8], [9]]);
  await testBothBlobOrUint8ArrayAsStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 3, [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ]);
  await testBothBlobOrUint8ArrayAsStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, [[1, 2, 3, 4], [5, 6, 7, 8], [9]]);
  await testBothBlobOrUint8ArrayAsStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 5, [
    [1, 2, 3, 4, 5],
    [6, 7, 8, 9],
  ]);
  await testBothBlobOrUint8ArrayAsStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 9, [[1, 2, 3, 4, 5, 6, 7, 8, 9]]);
  await testBothBlobOrUint8ArrayAsStream([1, 2, 3, 4, 5, 6, 7, 8, 9], 400, [[1, 2, 3, 4, 5, 6, 7, 8, 9]]);
});

async function test_readAsStream_then_readToUint8Array(
  arrLength: number,
  chunkLength: number,
  mode: 'BLOB' | 'UINT8ARRAY'
): Promise<void> {
  const bytes = [];
  for (let i = 0; i < arrLength; i++) {
    bytes.push(Math.floor(Math.random() * 256));
  }
  let blobOrUint8Array: Blob | Uint8Array;
  if (mode === 'BLOB') {
    blobOrUint8Array = new Blob([new Uint8Array(bytes).buffer]);
  } else if (mode === 'UINT8ARRAY') {
    blobOrUint8Array = new Uint8Array(bytes);
  } else {
    throw new Error('Incorrect mode: ' + mode);
  }
  const rs = readAsStream(blobOrUint8Array, chunkLength);
  const res = await readToUint8Array(rs, bytes.length);
  expect(checkEqual(res, new Uint8Array(bytes))).toBe(true);
}

async function test_readAsStream_then_readToUint8Array_both(arrLength: number, chunkLength: number): Promise<void> {
  await test_readAsStream_then_readToUint8Array(arrLength, chunkLength, 'BLOB');
  await test_readAsStream_then_readToUint8Array(arrLength, chunkLength, 'UINT8ARRAY');
}

test('readAsStream then readToUint8Array', async () => {
  await test_readAsStream_then_readToUint8Array_both(100, 1);
  await test_readAsStream_then_readToUint8Array_both(100, 10);
  await test_readAsStream_then_readToUint8Array_both(100, 100);
  await test_readAsStream_then_readToUint8Array_both(1000, 100);
  await test_readAsStream_then_readToUint8Array_both(1000, 1024);
});

test.skip('readAsStream then readToUint8Array long arr short chunks', async () => {
  await test_readAsStream_then_readToUint8Array_both(1000 * 1002, 2);
  await test_readAsStream_then_readToUint8Array_both(1000 * 1003, 20);
});

test('readAsStream then readToUint8Array only Uint8Array long arr short chunks', async () => {
  await test_readAsStream_then_readToUint8Array(1000 * 1002, 2, 'UINT8ARRAY');
  await test_readAsStream_then_readToUint8Array(1000 * 1003, 20, 'UINT8ARRAY');
});

async function testTextReaderOutput(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  expectedOutputStrings: Array<string>
): Promise<void> {
  const decoder = new TextDecoder();
  let readRes;
  for (const expectedString of expectedOutputStrings) {
    readRes = await reader.read();
    assert(readRes.value !== undefined);
    expect(decoder.decode(readRes.value.buffer)).toBe(expectedString);
  }
  readRes = await reader.read();
  expect(readRes.done).toBe(true);
}

async function testStringReadAsStream(
  testString: string,
  chunkLength: number,
  expectedOutputStrings: Array<string>
): Promise<void> {
  const rs = readAsStream(testString, chunkLength);
  const reader = rs.getReader();
  await testTextReaderOutput(reader, expectedOutputStrings);
}

test('readAsStream for string', async () => {
  const testString = 'Test string';
  await testStringReadAsStream(testString, 1, testString.split(''));
  await testStringReadAsStream(testString, 2, ['Te', 'st', ' s', 'tr', 'in', 'g']);
  await testStringReadAsStream(testString, 3, ['Tes', 't s', 'tri', 'ng']);
  await testStringReadAsStream(testString, 4, ['Test', ' str', 'ing']);
  await testStringReadAsStream(testString, 6, ['Test s', 'tring']);
  await testStringReadAsStream(testString, 11, ['Test string']);
});

async function testSkipTransformStream(
  testString: string,
  skipLengthLeft: number,
  chunkLength: number,
  expectedOutputStrings: Array<string>
) {
  const skipStream = SkipTransformStream(skipLengthLeft);
  const rs = readAsStream(testString, chunkLength);
  const reader = rs.pipeThrough(skipStream).getReader();
  await testTextReaderOutput(reader, expectedOutputStrings);
}

test('SkipTransformStream', async () => {
  const testString1 = 'Test string long enough';
  await testSkipTransformStream(testString1, 0, 10, ['Test strin', 'g long eno', 'ugh']);
  await testSkipTransformStream(testString1, 1, 10, ['est strin', 'g long eno', 'ugh']);
  await testSkipTransformStream(testString1, 2, 10, ['st strin', 'g long eno', 'ugh']);
  await testSkipTransformStream(testString1, 3, 10, ['t strin', 'g long eno', 'ugh']);
  await testSkipTransformStream(testString1, 9, 10, ['n', 'g long eno', 'ugh']);
  await testSkipTransformStream(testString1, 10, 10, ['g long eno', 'ugh']);
  await testSkipTransformStream(testString1, 11, 10, [' long eno', 'ugh']);
  await testSkipTransformStream(testString1, 15, 10, ['g eno', 'ugh']);
  await testSkipTransformStream(testString1, 22, 10, ['h']);
  await testSkipTransformStream(testString1, 23, 10, []);
  await testSkipTransformStream(testString1, 254, 10, []);

  const testString2 = 'a';
  await testSkipTransformStream(testString2, 0, 1, ['a']);
  await testSkipTransformStream(testString2, 1, 1, []);
  await testSkipTransformStream(testString2, 1, 31, []);
});

async function testPadTransformStream(
  testString: string,
  inputChunkSize: number,
  padChunkSize: number,
  startPos: number,
  expectedOutputStrings: Array<string>
) {
  const padStream = PadTransformStream(padChunkSize, startPos);
  const rs = readAsStream(testString, inputChunkSize);
  const reader = rs.pipeThrough(padStream).getReader();
  await testTextReaderOutput(reader, expectedOutputStrings);
}

test('PadTransformStream with zero posStart', async () => {
  const testCases = [
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1'],
    },
    {
      testString: '12',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['12'],
    },
    {
      testString: '12',
      inputChunkSize: 10,
      padChunkSize: 1,
      posStart: 0,
      expectedOutputStrings: ['1', '2'],
    },
    {
      testString: '',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: [],
    },
    {
      testString: '123456789012345678901234567890123456789012345678901234567890',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890'],
    },
    {
      testString: '1234567890123456789012345678901234567890123456789012345678901',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1'],
    },
    {
      testString: '12345678901234567890123456789012345678901234567890123456789012',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '12'],
    },
    {
      testString: '1',
      inputChunkSize: 1,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1'],
    },
    {
      testString: '12',
      inputChunkSize: 1,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['12'],
    },
    {
      testString: '12',
      inputChunkSize: 1,
      padChunkSize: 1,
      posStart: 0,
      expectedOutputStrings: ['1', '2'],
    },
    {
      testString: '',
      inputChunkSize: 1,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: [],
    },
    {
      testString: '123456789012345678901234567890123456789012345678901234567890',
      inputChunkSize: 1,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890'],
    },
    {
      testString: '1234567890123456789012345678901234567890123456789012345678901',
      inputChunkSize: 1,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1'],
    },
    {
      testString: '12345678901234567890123456789012345678901234567890123456789012',
      inputChunkSize: 1,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '12'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 4,
      posStart: 0,
      expectedOutputStrings: ['1'],
    },
    {
      testString: '12',
      inputChunkSize: 14,
      padChunkSize: 4,
      posStart: 0,
      expectedOutputStrings: ['12'],
    },
    {
      testString: '12',
      inputChunkSize: 2,
      padChunkSize: 1,
      posStart: 0,
      expectedOutputStrings: ['1', '2'],
    },
    {
      testString: '',
      inputChunkSize: 44,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: [],
    },
    {
      testString: '123456789012345678901234567890123456789012345678901234567890',
      inputChunkSize: 12,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890'],
    },
    {
      testString: '1234567890123456789012345678901234567890123456789012345678901',
      inputChunkSize: 1024,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1'],
    },
    {
      testString: '12345678901234567890123456789012345678901234567890123456789012',
      inputChunkSize: 9,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '1234567890', '12'],
    },
    {
      testString: '1',
      inputChunkSize: 2,
      padChunkSize: 2,
      posStart: 0,
      expectedOutputStrings: ['1'],
    },
    {
      testString: '12',
      inputChunkSize: 10,
      padChunkSize: 2,
      posStart: 0,
      expectedOutputStrings: ['12'],
    },
    {
      testString: '12',
      inputChunkSize: 10,
      padChunkSize: 1,
      posStart: 0,
      expectedOutputStrings: ['1', '2'],
    },
    {
      testString: '12',
      inputChunkSize: 1,
      padChunkSize: 3,
      posStart: 0,
      expectedOutputStrings: ['12'],
    },
    {
      testString: '',
      inputChunkSize: 1,
      padChunkSize: 22,
      posStart: 0,
      expectedOutputStrings: [],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['abcdefghij', 'klmn'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 23,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['abcdefghij', 'klmn'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 11,
      padChunkSize: 10,
      posStart: 0,
      expectedOutputStrings: ['abcdefghij', 'klmn'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 3,
      padChunkSize: 1,
      posStart: 0,
      expectedOutputStrings: 'abcdefghijklmn'.split(''),
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 4,
      padChunkSize: 3,
      posStart: 0,
      expectedOutputStrings: ['abc', 'def', 'ghi', 'jkl', 'mn'],
    },
  ];
  for (const testCase of testCases) {
    await testPadTransformStream(
      testCase.testString,
      testCase.inputChunkSize,
      testCase.padChunkSize,
      testCase.posStart,
      testCase.expectedOutputStrings
    );
  }
});

test('PadTransformStream with posStart > 0', async () => {
  const testCases = [
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 1,
      expectedOutputStrings: ['\u0000' + '1'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 1,
      posStart: 1,
      expectedOutputStrings: ['\u0000', '1'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 1,
      posStart: 2,
      expectedOutputStrings: ['\u0000', '\u0000', '1'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 2,
      posStart: 2,
      expectedOutputStrings: ['\u0000\u0000', '1'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 2,
      posStart: 3,
      expectedOutputStrings: ['\u0000\u0000', '\u00001'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 2,
      posStart: 4,
      expectedOutputStrings: ['\u0000\u0000', '\u0000\u0000', '1'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 2,
      expectedOutputStrings: ['\u0000\u0000' + '1'],
    },
    {
      testString: '1',
      inputChunkSize: 10,
      padChunkSize: 2,
      posStart: 2,
      expectedOutputStrings: ['\u0000\u0000', '1'],
    },
    {
      testString: '12',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 9,
      expectedOutputStrings: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u00001', '2'],
    },
    {
      testString: '12',
      inputChunkSize: 10,
      padChunkSize: 1,
      posStart: 1,
      expectedOutputStrings: ['\u0000', '1', '2'],
    },
    {
      testString: '',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 4,
      expectedOutputStrings: ['\u0000\u0000\u0000\u0000'],
    },
    {
      testString: '1234567890123456789012345678901234567890123456789012345678901',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 1,
      expectedOutputStrings: [
        '\u0000123456789',
        '0123456789',
        '0123456789',
        '0123456789',
        '0123456789',
        '0123456789',
        '01',
      ],
    },
    {
      testString: '1234567890123456789012345678901234567890123456789012345678901',
      inputChunkSize: 10,
      padChunkSize: 10,
      posStart: 4,
      expectedOutputStrings: [
        '\u0000\u0000\u0000\u0000123456',
        '7890123456',
        '7890123456',
        '7890123456',
        '7890123456',
        '7890123456',
        '78901',
      ],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 23,
      padChunkSize: 10,
      posStart: 1,
      expectedOutputStrings: ['\u0000abcdefghi', 'jklmn'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 11,
      padChunkSize: 10,
      posStart: 5,
      expectedOutputStrings: ['\u0000\u0000\u0000\u0000\u0000abcde', 'fghijklmn'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 11,
      padChunkSize: 10,
      posStart: 6,
      expectedOutputStrings: ['\u0000\u0000\u0000\u0000\u0000\u0000abcd', 'efghijklmn'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 11,
      padChunkSize: 10,
      posStart: 7,
      expectedOutputStrings: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000abc', 'defghijklm', 'n'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 11,
      padChunkSize: 10,
      posStart: 8,
      expectedOutputStrings: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000ab', 'cdefghijkl', 'mn'],
    },
    {
      testString: 'abcdefghijklmn',
      inputChunkSize: 11,
      padChunkSize: 10,
      posStart: 9,
      expectedOutputStrings: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000a', 'bcdefghijk', 'lmn'],
    },
  ];
  for (const testCase of testCases) {
    await testPadTransformStream(
      testCase.testString,
      testCase.inputChunkSize,
      testCase.padChunkSize,
      testCase.posStart,
      testCase.expectedOutputStrings
    );
  }
});

test('Integral test of stream utils', async () => {
  const testString =
    '1234567890123456789012345678901234567890123456789012345678901AbcdAbBsdfsdfwefr8901AbcdAbBsdfsdfwefr8901AbcdAbBsdfsdfwefr8901AbcdAbBsdfsdfwefr!!8901AbcdAbBsdfsdfwefr';
  const res = await readToUint8Array(
    readAsStream(testString, 10000)
      .pipeThrough(PadTransformStream(22, 12))
      .pipeThrough(PadTransformStream(128, 127))
      .pipeThrough(SkipTransformStream(12 + 127))
      .pipeThrough(PadTransformStream(1, 1))
      .pipeThrough(PadTransformStream(3, 2))
      .pipeThrough(SkipTransformStream(1 + 2))
  );
  expect(new TextDecoder().decode(res)).toBe(testString);
});

test('uint8ArrayToBase64 then base64ToUint8Array then uint8ArrayToBase64 again', () => {
  const u8arr = new Uint8Array(getRandomArray(2000));
  const base64Str = uint8ArrayToBase64(u8arr);
  const u8arrRestored = base64ToUint8Array(base64Str);
  expect(checkEqual(u8arrRestored, u8arr)).toBe(true);
});
