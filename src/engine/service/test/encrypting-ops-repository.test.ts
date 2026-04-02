import { expect, test } from 'vitest';
import { getEncryptingOpsRepository, getParallelEncryptingOpsRepositories } from './implementations/encrypting-ops-repository-test-impl';

test('Empty drive returns empty result', async () => {
  const { encryptingOpsRepository } = await getEncryptingOpsRepository();
  const decoder = new TextDecoder();
  const opsStr = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr).toStrictEqual('');
});

test('Save operation then get operation', async () => {
  const { encryptingOpsRepository } = await getEncryptingOpsRepository();
  const str1 = '12345';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  await encryptingOpsRepository.saveOperation(encoder.encode(str1));
  const opsStr = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr).toStrictEqual(str1);
});

test('Get operations from different positions', async () => {
  const { encryptingOpsRepository } = await getEncryptingOpsRepository();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  await encryptingOpsRepository.saveOperation(encoder.encode('12345'));
  let opsStr = decoder.decode(await encryptingOpsRepository.getOperations(0));
  expect(opsStr).toStrictEqual('12345');
  opsStr = decoder.decode(await encryptingOpsRepository.getOperations(1));
  expect(opsStr).toStrictEqual('2345');
  opsStr = decoder.decode(await encryptingOpsRepository.getOperations(2));
  expect(opsStr).toStrictEqual('345');
  opsStr = decoder.decode(await encryptingOpsRepository.getOperations(4));
  expect(opsStr).toStrictEqual('5');
});

test('getOperations from startBytePos greater then max available', async () => {
  const { encryptingOpsRepository } = await getEncryptingOpsRepository();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  await encryptingOpsRepository.saveOperation(encoder.encode('12345'));
  let opsStr = decoder.decode(await encryptingOpsRepository.getOperations(5));
  expect(opsStr).toStrictEqual('');
  opsStr = decoder.decode(await encryptingOpsRepository.getOperations(67));
  expect(opsStr).toStrictEqual('');
});

test('Save multiple operations then get them in one chunk', async () => {
  const { encryptingOpsRepository } = await getEncryptingOpsRepository();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const str1 = '12345';
  const str2 = 'abcde';
  const str3 = '@#!!Ж¢•d';
  await encryptingOpsRepository.saveOperation(encoder.encode(str1));
  await encryptingOpsRepository.saveOperation(encoder.encode(str2));
  await encryptingOpsRepository.saveOperation(encoder.encode(str3));
  const opsStr = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr).toStrictEqual(str1 + str2 + str3);
});

test('Save operations - get - save - get', async () => {
  const { encryptingOpsRepository } = await getEncryptingOpsRepository();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const str1 = '12345';
  const str2 = 'abcde';
  const str3 = '@#!!Ж¢•d';
  const str4 = 'final one';
  await encryptingOpsRepository.saveOperation(encoder.encode(str1));
  const opsStr1 = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr1).toStrictEqual(str1);
  await encryptingOpsRepository.saveOperation(encoder.encode(str2));
  const opsStr2 = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr2).toStrictEqual(str2);
  await encryptingOpsRepository.saveOperation(encoder.encode(str3));
  await encryptingOpsRepository.saveOperation(encoder.encode(str4));
  const opsStr3 = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr3).toStrictEqual(str3 + str4);
  const opsStr4 = decoder.decode(await encryptingOpsRepository.getOperations(0));
  expect(opsStr4).toStrictEqual(str1 + str2 + str3 + str4);
});

test('Save empty operation does not change anything', async () => {
  const { encryptingOpsRepository } = await getEncryptingOpsRepository();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const str1 = '12345';
  const str2 = 'abcde';
  await encryptingOpsRepository.saveOperation(encoder.encode(str1));
  await encryptingOpsRepository.saveOperation(encoder.encode(''));
  await encryptingOpsRepository.saveOperation(encoder.encode(''));
  let opsStr = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr).toStrictEqual(str1);
  await encryptingOpsRepository.saveOperation(encoder.encode(''));
  await encryptingOpsRepository.saveOperation(encoder.encode(str2));
  await encryptingOpsRepository.saveOperation(encoder.encode(''));
  opsStr = decoder.decode(await encryptingOpsRepository.getOperations());
  expect(opsStr).toStrictEqual(str2);
});

test('If getOperations-saveOperations atomic, then no corruption happens with parallel writing', async () => {
  const [e1, e2] = await getParallelEncryptingOpsRepositories();
  const encryptingOpsRepository1 = e1.encryptingOpsRepository;
  const encryptingOpsRepository2 = e2.encryptingOpsRepository;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const str1 = '12345';
  const str2 = 'abcde';
  const str3 = '@#!!Ж¢•d';
  let opsStr = decoder.decode(await encryptingOpsRepository1.getOperations());
  expect(opsStr).toStrictEqual('');
  await encryptingOpsRepository1.saveOperation(encoder.encode(str1));

  opsStr = decoder.decode(await encryptingOpsRepository2.getOperations());
  expect(opsStr).toStrictEqual(str1);
  await encryptingOpsRepository2.saveOperation(encoder.encode(str2));

  opsStr = decoder.decode(await encryptingOpsRepository1.getOperations());
  expect(opsStr).toStrictEqual(str1+str2);
  await encryptingOpsRepository1.saveOperation(encoder.encode(str3));
  opsStr = decoder.decode(await encryptingOpsRepository1.getOperations());
  expect(opsStr).toStrictEqual(str3);

  opsStr = decoder.decode(await encryptingOpsRepository2.getOperations());
  expect(opsStr).toStrictEqual(str2+str3);

  opsStr = decoder.decode(await encryptingOpsRepository2.getOperations(0));
  expect(opsStr).toStrictEqual(str1+str2+str3);

  opsStr = decoder.decode(await encryptingOpsRepository2.getOperations());
  expect(opsStr).toStrictEqual("");
});

test('Corrupted block does not affect next ones', async () => {
  const [e1, e2] = await getParallelEncryptingOpsRepositories();
  const encryptingOpsRepository1 = e1.encryptingOpsRepository;
  const encryptingOpsRepository2 = e2.encryptingOpsRepository;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const str1 = '12345';
  const str2 = 'abcde';
  const str3 = '@#!!Ж¢•d';
  await encryptingOpsRepository1.getOperations();
  await encryptingOpsRepository1.saveOperation(encoder.encode(str1));
  await encryptingOpsRepository2.saveOperation(encoder.encode(str2));
  await encryptingOpsRepository1.getOperations();
  await encryptingOpsRepository1.saveOperation(encoder.encode(str3));
  const opsStr = decoder.decode(await encryptingOpsRepository1.getOperations(0));
  expect(opsStr.startsWith(str1)).toBe(true);
  expect(opsStr.endsWith(str3)).toBe(true);
});

// TODO: this occasionally fails
// test('Simultaneously save and then get ops with one repository', async () => {
//   const N = 50;
//   const str = '12345';
//   const encryptingOpsRepository = await getEncryptingOpsRepository();
//   const promises = [];
//   for (let i = 0; i < N; i++) {
//     promises.push(encryptingOpsRepository.saveOperation(str));
//   }
//   await Promise.all(promises);
//   const opsStr = await encryptingOpsRepository.getOperations();
//   let expected = '';
//   for (let i = 0; i < N; i++) {
//     expected += str;
//   }
//   expect(opsStr).toBe(expected);
// });
