import { describe, expect, it, test } from 'vitest';
import {
  FsOperation,
  MkDirFsOperation,
  RmFsOperation,
  RenameFsOperation,
  MvFsOperation,
  CpFsOperation,
  UploadStartFsOperation,
  UploadFinishFsOperation,
  DescriptionFsOperation,
} from '../fs-operation';

describe('FsOperation Tests', () => {
  describe('FsOperation and Subclasses', () => {
    it('should serialize and deserialize MkDirFsOperation correctly', () => {
      const operation = new MkDirFsOperation('user1', '/path/to/dir');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as MkDirFsOperation;

      expect(deserialized).toBeInstanceOf(MkDirFsOperation);
      expect(deserialized.path).toBe('/path/to/dir');
      expect(deserialized.createdBy).toBe('user1');
    });

    it('should serialize and deserialize RmFsOperation correctly', () => {
      const operation = new RmFsOperation('user2', '/base/path', ['file1', 'file2']);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as RmFsOperation;

      expect(deserialized).toBeInstanceOf(RmFsOperation);
      expect(deserialized.basePath).toBe('/base/path');
      expect(deserialized.fileNames).toEqual(['file1', 'file2']);
      expect(deserialized.createdBy).toBe('user2');
    });

    it('should serialize and deserialize RenameFsOperation correctly', () => {
      const operation = new RenameFsOperation('user3', '/src/path', '/dest/path');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as RenameFsOperation;

      expect(deserialized).toBeInstanceOf(RenameFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.pathDest).toBe('/dest/path');
      expect(deserialized.createdBy).toBe('user3');
    });

    it('should serialize and deserialize MvFsOperation correctly without destFileNames', () => {
      const operation = new MvFsOperation('user4', '/src/path', ['file1'], '/dest/path', 'REPLACE', null);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as MvFsOperation;

      expect(deserialized).toBeInstanceOf(MvFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.fileNames).toEqual(['file1']);
      expect(deserialized.pathDest).toBe('/dest/path');
      expect(deserialized.createdBy).toBe('user4');
    });

    it('should serialize and deserialize MvFsOperation correctly with destFileNames', () => {
      const operation = new MvFsOperation('user4', '/src/path', ['file1'], '/dest/path', 'FIXED', ['newFile1']);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as MvFsOperation;

      expect(deserialized).toBeInstanceOf(MvFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.fileNames).toStrictEqual(['file1']);
      expect(deserialized.pathDest).toBe('/dest/path');
      expect(deserialized.destFileNames).toStrictEqual(['newFile1']);
      expect(deserialized.createdBy).toBe('user4');
    });


    it('should serialize and deserialize CpFsOperation correctly', () => {
      const operation = new CpFsOperation('user5', '/src/path', ['file1'], '/dest/path', 'RENAME', null);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as CpFsOperation;

      expect(deserialized).toBeInstanceOf(CpFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.fileNames).toEqual(['file1']);
      expect(deserialized.pathDest).toBe('/dest/path');
      expect(deserialized.createdBy).toBe('user5');
      expect(deserialized.destFileNames).toBeNull();
    });

    it('should serialize and deserialize UploadStartFsOperation correctly', () => {
      const operation = new UploadStartFsOperation('user6', '/file/path', 0, 100, 'REPLACE');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as UploadStartFsOperation;

      expect(deserialized).toBeInstanceOf(UploadStartFsOperation);
      expect(deserialized.path).toBe('/file/path');
      expect(deserialized.byteOffset).toBe(0);
      expect(deserialized.byteLength).toBe(100);
      expect(deserialized.createdBy).toBe('user6');
    });

    it('should serialize and deserialize UploadFinishFsOperation correctly', () => {
      const operation = new UploadFinishFsOperation('user7', 'startHash', 'contentHash');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as UploadFinishFsOperation;

      expect(deserialized).toBeInstanceOf(UploadFinishFsOperation);
      expect(deserialized.uploadStartOperationHash).toBe('startHash');
      expect(deserialized.fileContentHash).toBe('contentHash');
      expect(deserialized.createdBy).toBe('user7');
    });

    it('should serialize and deserialize DescriptionFsOperation correctly', () => {
      const operation = new DescriptionFsOperation('user8', 'This is a description');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as DescriptionFsOperation;

      expect(deserialized).toBeInstanceOf(DescriptionFsOperation);
      expect(deserialized.description).toBe('This is a description');
      expect(deserialized.createdBy).toBe('user8');
    });

    it('should throw an error for unsupported operation type', () => {
      const invalidSerialized = '[null,null,999,null,null,null,"user",null,"[]"]';
      expect(() => FsOperation.deserialize(invalidSerialized)).toThrowError();
    });
  });
});


test('Serialize-deserialize ops', () => {
  // TODO: more operations
  const testCases = [
    new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/'),
    new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/dir/subdir'),
    new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/1/2/3/folDER_NAME'),
    new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/dir/subdir'),
    new RmFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/', ['dir', 'dir2']),
    new RmFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/dir/subdir', ['file1', 'file2']),
    new RmFsOperation('', '/dir/subdir/1/2/3/newFile.docx', ['file1']),
    new RmFsOperation('', '/dir/dir/dir/DirectoryNew/Files.Json.Docs.XML', ['file1', 'file2', 'file2']),
    new RenameFsOperation(
      '123',
      '/dir/dir/dir/DirectoryNew/Files.Json.Docs.XML',
      '/dir/dir/dir/DirectoryNew/Files.Json.Docs1.XML'
    ),
    new RenameFsOperation('4f4d7b10', '/1', '/2'),
    new RenameFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/1', '/2/12234324'),
    new CpFsOperation(
      '123',
      '/dir/dir/dir/DirectoryNew/', ['Files.Json.Docs.XML'],
      '/dir/dir/dir/DirectoryNew/FilesNew', 'FIXED', ['Files.Json.Docs1.XML']
    ),
    new CpFsOperation('4f4d7b10', '/', ['1', '2'], '/n', 'REPLACE', null),
    new CpFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/1', ['a', 'b', 'c'], '/1/1', 'FIXED', ['b', 'c', 'd']),
    new UploadStartFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/', 0, 100, 'RENAME'),
    new UploadFinishFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '---', '00000')
  ];

  for (const testCase of testCases) {
    const serialized = testCase.serialize();
    const deserialized = FsOperation.deserialize(serialized);
    expect(deserialized).toStrictEqual(testCase);
  }
});

test('Operation constructors fill in required fields', () => {
  const createdBy = '4f4d7b10-a600-471d-835d-627f26b3327c';
  const path = '/dir/subdir';
  const path2 = '/dir/subdir2';
  const op1 = new MkDirFsOperation(createdBy, path);
  expect(op1.randomStr.length).toBeGreaterThan(0);
  expect(op1.path).toBe(path);
  expect(op1.timestamp).toBe(null);
  expect(op1.timestampSig).toBe(null);
  expect(op1.createdBySig).toBe(null);

  const op2 = new RmFsOperation(createdBy, path, ['file1.doc', 'file2.xml']);
  expect(op2.randomStr.length).toBeGreaterThan(0);
  expect(op2.basePath).toBe(path);
  expect(op2.timestamp).toBe(null);
  expect(op2.timestampSig).toBe(null);
  expect(op2.createdBySig).toBe(null);

  const op3 = new RenameFsOperation(createdBy, path, path2);
  expect(op3.randomStr.length).toBeGreaterThan(0);
  expect(op3.pathSrc).toBe(path);
  expect(op3.pathDest).toBe(path2);
  expect(op3.timestamp).toBe(null);
  expect(op3.timestampSig).toBe(null);
  expect(op3.createdBySig).toBe(null);

  const op4 = new CpFsOperation(createdBy, path, ['path'], path2, 'FIXED', ['path3']);
  expect(op4.randomStr.length).toBeGreaterThan(0);
  expect(op4.pathSrc).toBe(path);
  expect(op4.pathDest).toBe(path2);
  expect(op4.timestamp).toBe(null);
  expect(op4.timestampSig).toBe(null);
  expect(op4.createdBySig).toBe(null);
});

test('Hash is generated as a non-empty string', async () => {
  const op = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  let hash = await op.hashCode();
  expect(hash).toBeTypeOf('string');
  expect(hash.length).toBeGreaterThan(0);

  const op2 = new RmFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/dir/subdir', ['file1.doc', 'file2.xml']);
  hash = await op2.hashCode();
  expect(hash).toBeTypeOf('string');
  expect(hash.length).toBeGreaterThan(0);
});

test('Random str is not same for different instances of FsOperation', () => {
  const op1 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  const op2 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  expect(op1.randomStr).not.equal(op2.randomStr);
});

test('Operation hash of equal objects is equal', async () => {
  const op1 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  const op1Copy = FsOperation.deserialize(op1.serialize());
  const hashOp1 = await op1.hashCode();
  const hashOp1Copy = await op1Copy.hashCode();
  expect(hashOp1).equal(hashOp1Copy);
});

test('Operation hash of non-equal objects is not equal', async () => {
  const op1 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  const op2 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  const hashOp1 = await op1.hashCode();
  const hashOp2 = await op2.hashCode();
  expect(hashOp1).not.equal(hashOp2);
});

test('Broken op serialized str throws an error', () => {
  const op = new RmFsOperation('0', '/dir/subdir/1/2/3/newFile.docx', ['fileName.txt']);
  expect(() => FsOperation.deserialize(op.serialize() + '!')).toThrow();
});

test('Custom-fields hash', async () => {
  const op1 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  const op2 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
  let ignoreFields = ['randomStr'];
  let hashOp1 = await op1.hashCode(ignoreFields);
  let hashOp2 = await op2.hashCode(ignoreFields);
  expect(hashOp1).equal(hashOp2);
  ignoreFields = ['id'];
  hashOp1 = await op1.hashCode(ignoreFields);
  hashOp2 = await op2.hashCode(ignoreFields);
  expect(hashOp1).not.equal(hashOp2);
  ignoreFields = ['randomStr', 'path'];
  hashOp1 = await op1.hashCode(ignoreFields);
  hashOp2 = await op2.hashCode(ignoreFields);
  expect(hashOp1).equal(hashOp2);
  ignoreFields = ['randomStr', 'path', 'createdBy', 'createdBySig'];
  hashOp1 = await op1.hashCode(ignoreFields);
  hashOp2 = await op2.hashCode(ignoreFields);
  expect(hashOp1).equal(hashOp2);
  ignoreFields = ['randomStr', 'createdBy', 'createdBySig'];
  hashOp2 = await op1.hashCode(ignoreFields);
  expect(hashOp1).not.equal(hashOp2);
});
