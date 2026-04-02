import { expect, test } from 'vitest';
import { getParallelSplittingOpsRepositories, getSplittingOpsRepository } from './implementations/splitting-ops-repository-test-impl';


test('Empty container returns empty result', async () => {
  const { splittingOpsRepository } = await getSplittingOpsRepository();
  const opsStrArray = await splittingOpsRepository.getOperations();
  expect(opsStrArray).toStrictEqual([]);
});

test('Save operation then get operation', async () => {
  const { splittingOpsRepository } = await getSplittingOpsRepository();
  const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
  await splittingOpsRepository.saveOperation(bytes1);
  const opsStrArray = await splittingOpsRepository.getOperations();
  const sl = splittingOpsRepository.OPS_SEPARATOR_BYTE_LENGTH;
  expect(opsStrArray).toStrictEqual([
    { opBytes: bytes1, startBytePos: sl, byteLength: 5 },
  ]);
});

test('Save multiple operations then get them', async () => {
  const { splittingOpsRepository } = await getSplittingOpsRepository();
  const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
  const bytes2 = new Uint8Array([10, 12, 233, 14, 55, 1, 3, 4, 5, 6, 7, 8]);
  const bytes3 = new Uint8Array([101, 200, 23, 4]);

  await splittingOpsRepository.saveOperation(bytes1);
  await splittingOpsRepository.saveOperation(bytes2);
  await splittingOpsRepository.saveOperation(bytes3);
  const opsStrArray = await splittingOpsRepository.getOperations();
  const sl = splittingOpsRepository.OPS_SEPARATOR_BYTE_LENGTH;
  expect(opsStrArray).toStrictEqual([
    { opBytes: bytes1, startBytePos: sl, byteLength: 5 },
    { opBytes: bytes2, startBytePos: 3*sl + 5, byteLength: 12 },
    { opBytes: bytes3, startBytePos: 5*sl + 5 + 12, byteLength: 4 },
  ]);
});

test('Save multiple operations then get them - with empty ops 1', async () => {
  const { splittingOpsRepository } = await getSplittingOpsRepository();
  const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
  const bytes2 = new Uint8Array([]);
  const bytes3 = new Uint8Array([101, 200, 23, 4]);

  await splittingOpsRepository.saveOperation(bytes1);
  await splittingOpsRepository.saveOperation(bytes2);
  await splittingOpsRepository.saveOperation(bytes3);
  const opsStrArray = await splittingOpsRepository.getOperations();
  const sl = splittingOpsRepository.OPS_SEPARATOR_BYTE_LENGTH;
  expect(opsStrArray).toStrictEqual([
    { opBytes: bytes1, startBytePos: sl, byteLength: 5 },
    { opBytes: bytes3, startBytePos: 5*sl + 5, byteLength: 4 },
  ]);
});

test('Save multiple operations then get them - with empty ops 2', async () => {
  const { splittingOpsRepository } = await getSplittingOpsRepository();
  const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
  const bytes2 = new Uint8Array([]);
  const bytes3 = new Uint8Array([]);

  await splittingOpsRepository.saveOperation(bytes1);
  await splittingOpsRepository.saveOperation(bytes2);
  await splittingOpsRepository.saveOperation(bytes3);
  const opsStrArray = await splittingOpsRepository.getOperations();
  const sl = splittingOpsRepository.OPS_SEPARATOR_BYTE_LENGTH;
  expect(opsStrArray).toStrictEqual([
    { opBytes: bytes1, startBytePos: sl, byteLength: 5 },
  ]);
});

test('Save series of empty operations', async () => {
  const { splittingOpsRepository } = await getSplittingOpsRepository();
  const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
  const bytes2 = new Uint8Array([10, 12, 233, 14, 55, 1, 3, 4, 5, 6, 7, 8]);
  const bytes3 = new Uint8Array([101, 200, 23, 4]);
  const emptyBytes = new Uint8Array([]);

  await splittingOpsRepository.saveOperation(emptyBytes);
  await splittingOpsRepository.saveOperation(emptyBytes);
  await splittingOpsRepository.saveOperation(bytes1);
  await splittingOpsRepository.saveOperation(emptyBytes);
  await splittingOpsRepository.saveOperation(bytes2);
  await splittingOpsRepository.saveOperation(emptyBytes);
  await splittingOpsRepository.saveOperation(emptyBytes);
  await splittingOpsRepository.saveOperation(emptyBytes);
  await splittingOpsRepository.saveOperation(bytes3);
  await splittingOpsRepository.saveOperation(emptyBytes);
  const sl = splittingOpsRepository.OPS_SEPARATOR_BYTE_LENGTH;
  const opsStrArray = await splittingOpsRepository.getOperations();
  expect(opsStrArray).toStrictEqual([
    { opBytes: bytes1, startBytePos: 5 * sl, byteLength: 5 },
    { opBytes: bytes2, startBytePos: 9 * sl + 5, byteLength: 12 },
    { opBytes: bytes3, startBytePos: 17 * sl + 17, byteLength: 4 },
  ]);
});

test('If getOperations-saveOperations atomic, then no corruption happens with parallel writing', async () => {
  const [e1, e2] = await getParallelSplittingOpsRepositories();
  const splittingOpsRepository1 = e1.splittingOpsRepository;
  const splittingOpsRepository2 = e2.splittingOpsRepository;
  const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
  const bytes2 = new Uint8Array([101, 200, 23, 4, 4]);
  const bytes3 = new Uint8Array([10, 12, 233, 14, 55, 1, 3, 4, 5, 6, 7, 8]);
  const bytes4 = new Uint8Array([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
  const bytes5 = new Uint8Array([111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6]);

  const sl = splittingOpsRepository1.OPS_SEPARATOR_BYTE_LENGTH;

  const byteOp1 = { opBytes: bytes1, startBytePos: sl, byteLength: 5 };
  const byteOp2 = { opBytes: bytes2, startBytePos: 5 + 3*sl, byteLength: 5 };
  const byteOp3 = { opBytes: bytes3, startBytePos: 5 + 5 + 5*sl, byteLength: 12 };
  const byteOp4 = { opBytes: bytes4, startBytePos: 5 + 5 + 12 + 7*sl, byteLength: 12 };
  const byteOp5 = { opBytes: bytes5, startBytePos: 5 + 5 + 12 + 12 + 9*sl, byteLength: 28 };

  let opsStrArray = await splittingOpsRepository1.getOperations();
  expect(opsStrArray).toStrictEqual([]);
  await splittingOpsRepository1.saveOperation(bytes1);

  opsStrArray = await splittingOpsRepository2.getOperations();
  expect(opsStrArray).toStrictEqual([byteOp1]);
  await splittingOpsRepository1.saveOperation(bytes2);

  opsStrArray = await splittingOpsRepository2.getOperations();
  expect(opsStrArray).toStrictEqual([byteOp2]);
  opsStrArray = await splittingOpsRepository2.getOperations(0);
  expect(opsStrArray).toStrictEqual([byteOp1, byteOp2]);

  opsStrArray = await splittingOpsRepository1.getOperations();
  expect(opsStrArray).toStrictEqual([byteOp1, byteOp2]);
  opsStrArray = await splittingOpsRepository1.getOperations();
  expect(opsStrArray).toStrictEqual([]);
  opsStrArray = await splittingOpsRepository1.getOperations(0);
  expect(opsStrArray).toStrictEqual([byteOp1, byteOp2]);
  await splittingOpsRepository1.saveOperation(bytes3);
  opsStrArray = await splittingOpsRepository1.getOperations();
  expect(opsStrArray).toStrictEqual([byteOp3]);
  await splittingOpsRepository1.saveOperation(bytes4);

  opsStrArray = await splittingOpsRepository2.getOperations();
  expect(opsStrArray).toStrictEqual([byteOp3, byteOp4]);
  await splittingOpsRepository2.saveOperation(bytes5);
  opsStrArray = await splittingOpsRepository2.getOperations();
  expect(opsStrArray).toStrictEqual([byteOp5]);

  opsStrArray = await splittingOpsRepository1.getOperations();
  expect(opsStrArray).toStrictEqual([byteOp4, byteOp5]);

  opsStrArray = await splittingOpsRepository1.getOperations(0);
  expect(opsStrArray).toStrictEqual([byteOp1, byteOp2, byteOp3, byteOp4, byteOp5]);

  opsStrArray = await splittingOpsRepository2.getOperations(0);
  expect(opsStrArray).toStrictEqual([byteOp1, byteOp2, byteOp3, byteOp4, byteOp5]);
});

test('Save operations with corrupted block', async () => {
  const { splittingOpsRepository } = await getSplittingOpsRepository();
  const bytes1 = new Uint8Array([1, 2, 3, 4, 5]);
  const bytes2 = new Uint8Array([101, 200, 23, 4, 4]);

  await splittingOpsRepository.saveOperation(bytes1);
  await splittingOpsRepository['encryptingOperationsRepository'].saveOperation(bytes2);
  let opsStrArray = await splittingOpsRepository.getOperations();
  const sl = splittingOpsRepository.OPS_SEPARATOR_BYTE_LENGTH;
  expect(opsStrArray).toStrictEqual([
    { opBytes: bytes1, startBytePos: sl, byteLength: 5 },
    { opBytes: bytes2, startBytePos: 5 + 2*sl, byteLength: bytes2.length },
  ]);
  await splittingOpsRepository.saveOperation(bytes1);
  opsStrArray = await splittingOpsRepository.getOperations(0);
  expect(opsStrArray).toStrictEqual([
    { opBytes: bytes1, startBytePos: sl, byteLength: 5 },
    { opBytes: bytes2, startBytePos: 5 + 2*sl, byteLength: bytes2.length },
    { opBytes: bytes1, startBytePos: 5 + 2*sl + bytes2.length + sl, byteLength: 5 },
  ]);
});