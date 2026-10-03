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
      const operation = new MkDirFsOperation('/path/to/dir');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as MkDirFsOperation;

      expect(deserialized).toBeInstanceOf(MkDirFsOperation);
      expect(deserialized.path).toBe('/path/to/dir');
    });

    it('should serialize and deserialize RmFsOperation correctly', () => {
      const operation = new RmFsOperation('/base/path', ['file1', 'file2']);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as RmFsOperation;

      expect(deserialized).toBeInstanceOf(RmFsOperation);
      expect(deserialized.basePath).toBe('/base/path');
      expect(deserialized.fileNames).toEqual(['file1', 'file2']);
    });

    it('should serialize and deserialize RenameFsOperation correctly', () => {
      const operation = new RenameFsOperation('/src/path', '/dest/path');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as RenameFsOperation;

      expect(deserialized).toBeInstanceOf(RenameFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.pathDest).toBe('/dest/path');
    });

    it('should serialize and deserialize MvFsOperation correctly without destFileNames', () => {
      const operation = new MvFsOperation('/src/path', ['file1'], '/dest/path', 'REPLACE', null);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as MvFsOperation;

      expect(deserialized).toBeInstanceOf(MvFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.fileNames).toEqual(['file1']);
      expect(deserialized.pathDest).toBe('/dest/path');
    });

    it('should serialize and deserialize MvFsOperation correctly with destFileNames', () => {
      const operation = new MvFsOperation('/src/path', ['file1'], '/dest/path', 'FIXED', ['newFile1']);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as MvFsOperation;

      expect(deserialized).toBeInstanceOf(MvFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.fileNames).toStrictEqual(['file1']);
      expect(deserialized.pathDest).toBe('/dest/path');
      expect(deserialized.destFileNames).toStrictEqual(['newFile1']);
    });


    it('should serialize and deserialize CpFsOperation correctly', () => {
      const operation = new CpFsOperation('/src/path', ['file1'], '/dest/path', 'RENAME', null);
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as CpFsOperation;

      expect(deserialized).toBeInstanceOf(CpFsOperation);
      expect(deserialized.pathSrc).toBe('/src/path');
      expect(deserialized.fileNames).toEqual(['file1']);
      expect(deserialized.pathDest).toBe('/dest/path');
      expect(deserialized.destFileNames).toBeNull();
    });

    it('should serialize and deserialize UploadStartFsOperation correctly', () => {
      const operation = new UploadStartFsOperation('/file/path', 0, 100, 'REPLACE');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as UploadStartFsOperation;

      expect(deserialized).toBeInstanceOf(UploadStartFsOperation);
      expect(deserialized.path).toBe('/file/path');
      expect(deserialized.byteOffset).toBe(0);
      expect(deserialized.byteLength).toBe(100);
    });

    it('should serialize and deserialize UploadFinishFsOperation correctly', () => {
      const operation = new UploadFinishFsOperation('startHash', 'contentHash');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as UploadFinishFsOperation;

      expect(deserialized).toBeInstanceOf(UploadFinishFsOperation);
      expect(deserialized.uploadStartOperationHash).toBe('startHash');
      expect(deserialized.fileContentHash).toBe('contentHash');
    });

    it('should serialize and deserialize DescriptionFsOperation correctly', () => {
      const operation = new DescriptionFsOperation('This is a description');
      const serialized = operation.serialize();
      const deserialized = FsOperation.deserialize(serialized) as DescriptionFsOperation;

      expect(deserialized).toBeInstanceOf(DescriptionFsOperation);
      expect(deserialized.description).toBe('This is a description');
    });

    it('should throw an error for unsupported operation type', () => {
      const invalidSerialized = '[null,null,999,null,null,null,"user",null,"[]"]';
      expect(() => FsOperation.deserialize(invalidSerialized)).toThrowError();
    });
  });
});


test('Serialize-deserialize ops', () => {
  const testCases = [
    new MkDirFsOperation('/'),
    new MkDirFsOperation('/dir/subdir'),
    new MkDirFsOperation('/1/2/3/folDER_NAME'),
    new MkDirFsOperation('/dir/subdir'),
    new RmFsOperation('/', ['dir', 'dir2']),
    new RmFsOperation('/dir/subdir', ['file1', 'file2']),
    new RmFsOperation('/dir/subdir/1/2/3/newFile.docx', ['file1']),
    new RmFsOperation('/dir/dir/dir/DirectoryNew/Files.Json.Docs.XML', ['file1', 'file2', 'file2']),
    new RenameFsOperation(
      '/dir/dir/dir/DirectoryNew/Files.Json.Docs.XML',
      '/dir/dir/dir/DirectoryNew/Files.Json.Docs1.XML'
    ),
    new RenameFsOperation('/1', '/2'),
    new RenameFsOperation('/1', '/2/12234324'),
    new CpFsOperation(
      '/dir/dir/dir/DirectoryNew/', ['Files.Json.Docs.XML'],
      '/dir/dir/dir/DirectoryNew/FilesNew', 'FIXED', ['Files.Json.Docs1.XML']
    ),
    new CpFsOperation('/', ['1', '2'], '/n', 'REPLACE', null),
    new CpFsOperation('/1', ['a', 'b', 'c'], '/1/1', 'FIXED', ['b', 'c', 'd']),
    new UploadStartFsOperation('/', 0, 100, 'RENAME'),
    new UploadFinishFsOperation('---', '00000')
  ];

  for (const testCase of testCases) {
    const serialized = testCase.serialize();
    const deserialized = FsOperation.deserialize(serialized);
    expect(deserialized).toStrictEqual(testCase);
  }
});

test('Operation constructors fill in required fields', () => {
  const path = '/dir/subdir';
  const path2 = '/dir/subdir2';
  const op1 = new MkDirFsOperation(path);
  expect(op1.randomStr.length).toBeGreaterThan(0);
  expect(op1.path).toBe(path);

  const op2 = new RmFsOperation(path, ['file1.doc', 'file2.xml']);
  expect(op2.randomStr.length).toBeGreaterThan(0);
  expect(op2.basePath).toBe(path);

  const op3 = new RenameFsOperation(path, path2);
  expect(op3.randomStr.length).toBeGreaterThan(0);
  expect(op3.pathSrc).toBe(path);
  expect(op3.pathDest).toBe(path2);

  const op4 = new CpFsOperation(path, ['path'], path2, 'FIXED', ['path3']);
  expect(op4.randomStr.length).toBeGreaterThan(0);
  expect(op4.pathSrc).toBe(path);
  expect(op4.pathDest).toBe(path2);
});

test('Hash is generated as a non-empty string', async () => {
  const op = new MkDirFsOperation('/');
  let hash = await op.hashCode();
  expect(hash).toBeTypeOf('string');
  expect(hash.length).toBeGreaterThan(0);

  const op2 = new RmFsOperation('/dir/subdir', ['file1.doc', 'file2.xml']);
  hash = await op2.hashCode();
  expect(hash).toBeTypeOf('string');
  expect(hash.length).toBeGreaterThan(0);
});

test('Random str is not same for different instances of FsOperation', () => {
  const op1 = new MkDirFsOperation('/');
  const op2 = new MkDirFsOperation('/');
  expect(op1.randomStr).not.equal(op2.randomStr);
});

test('Operation hash of equal objects is equal', async () => {
  const op1 = new MkDirFsOperation('/');
  const op1Copy = FsOperation.deserialize(op1.serialize());
  const hashOp1 = await op1.hashCode();
  const hashOp1Copy = await op1Copy.hashCode();
  expect(hashOp1).equal(hashOp1Copy);
});

test('Operation hash of non-equal objects is not equal', async () => {
  const op1 = new MkDirFsOperation('/');
  const op2 = new MkDirFsOperation('/');
  const hashOp1 = await op1.hashCode();
  const hashOp2 = await op2.hashCode();
  expect(hashOp1).not.equal(hashOp2);
});

test('Broken op serialized str throws an error', () => {
  const op = new RmFsOperation('/dir/subdir/1/2/3/newFile.docx', ['fileName.txt']);
  expect(() => FsOperation.deserialize(op.serialize() + '!')).toThrow();
});

test('Custom-fields hash', async () => {
  const op1 = new MkDirFsOperation('/');
  const op2 = new MkDirFsOperation('/');
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
  ignoreFields = ['randomStr', 'path'];
  hashOp1 = await op1.hashCode(ignoreFields);
  hashOp2 = await op2.hashCode(ignoreFields);
  expect(hashOp1).equal(hashOp2);
  ignoreFields = ['randomStr'];
  hashOp2 = await op1.hashCode(ignoreFields);
  expect(hashOp1).not.equal(hashOp2);
});
