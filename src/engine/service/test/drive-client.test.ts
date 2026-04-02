import { FsFileProperties, FsObjectType } from '../fs-state';
import { expect, test } from 'vitest';
import { getTestDriveClient } from './implementations/drive-client-test-impl';
import { DriveClient } from '../drive-client';
import { FsOperationNameConflictMode } from '../fs-operation';

test('Join path', async () => {
  const driveClient = await getTestDriveClient();
  expect(driveClient.joinPath('', '')).toBe('/');
  expect(driveClient.joinPath('/', '')).toBe('/');
  expect(driveClient.joinPath('/', '/')).toBe('/');
  expect(driveClient.joinPath('/a', '/')).toBe('/a');
  expect(driveClient.joinPath('/a', 'a')).toBe('/a/a');
  expect(driveClient.joinPath('/a/', '/b/c/d/')).toBe('/a/b/c/d');
  expect(driveClient.joinPath('/', '/a/')).toBe('/a');
});


test('mkdir, cd and pwd', async () => {
  const driveClient = await getTestDriveClient();
  expect(driveClient.pwd()).toBe('/');
  driveClient.cd('/');
  expect(driveClient.pwd()).toBe('/');
  await expect(driveClient.mkdir('/')).rejects.toThrowError('Invalid name: undefined');
  expect(() => driveClient.cd('/a')).toThrowError('Directory does not exist');
  await driveClient.mkdir('/a');
  driveClient.cd('/a');
  expect(driveClient.pwd()).toBe('/a');
  driveClient.cd('/');
  expect(driveClient.pwd()).toBe('/');
  driveClient.cd('/a/');
  expect(driveClient.pwd()).toBe('/a');
  driveClient.cd('/');
  expect(driveClient.pwd()).toBe('/');
  driveClient.cd('a');
  expect(driveClient.pwd()).toBe('/a');
  await expect(driveClient.mkdir('/a')).rejects.toThrowError('File or directory with target name already exists');
  await driveClient.mkdir('/b');
  await driveClient.mkdir('a');
  driveClient.cd('a');
  expect(driveClient.pwd()).toBe('/a/a');
  driveClient.cd('/a/a');
  expect(driveClient.pwd()).toBe('/a/a');
  await driveClient.mkdir('/b/b/');
  driveClient.cd('/');
  driveClient.cd('b');
  driveClient.cd('b');
  expect(driveClient.pwd()).toBe('/b/b');
  driveClient.cd('');
  expect(driveClient.pwd()).toBe('/b/b');
});

test('ls, mkdir and cd', async () => {
  const driveClient = await getTestDriveClient();
  expect(driveClient.ls('')).toStrictEqual([]);
  expect(driveClient.ls('/')).toStrictEqual([]);
  await driveClient.mkdir('subdir1');
  expect(driveClient.ls('').length).toBe(1);
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir1']]);
  expect(driveClient.ls('/').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir1']]);
  await driveClient.mkdir('/subdir2');
  expect(driveClient.ls('/').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'subdir1'],
    [FsObjectType.DIR, 'subdir2'],
  ]);
  driveClient.cd('subdir1');
  expect(driveClient.ls('/').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'subdir1'],
    [FsObjectType.DIR, 'subdir2'],
  ]);
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([]);
  await driveClient.mkdir('AAAAAa');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'AAAAAa']]);
  expect(driveClient.ls('/subdir1/').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'AAAAAa']]);
  expect(() => driveClient.ls('/a')).toThrowError('Directory does not exist');
  driveClient.cd('');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'AAAAAa']]);
  driveClient.cd('/');
  expect(driveClient.ls('/subdir1/').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'AAAAAa']]);
});

test('rm, mkdir, ls and cd', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('subdir1');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir1']]);
  let opsRes = await driveClient.rm(['subdir1']);
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('/')).toStrictEqual([]);
  await driveClient.mkdir('subdir1');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir1']]);
  await driveClient.mkdir('subdir1/subdir2');
  expect(driveClient.ls('/').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir1']]);
  expect(driveClient.ls('/subdir1/').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir2']]);
  await expect(driveClient.rm(['subdir3'], 'subdir1')).rejects.toThrowError('Target does not exist');
  await driveClient.mkdir('subdir1/subdir3');
  opsRes = await driveClient.rm(['subdir1']);
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('')).toStrictEqual([]);
  await driveClient.mkdir('subdir1');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir1']]);
  expect(driveClient.ls('subdir1')).toStrictEqual([]);
  driveClient.cd('subdir1');
  await driveClient.mkdir('subdir2');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir2']]);
  await expect(driveClient.rm([''], '/')).rejects.toThrowError('Target cannot be changed');
});

test('Complex test: rename, rm, mkdir, ls, cd and pwd', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('subdir1');
  await driveClient.rename('subdir1', 'subdir2');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir2']]);
  await driveClient.rename('subdir2', '33subdir3');
  await driveClient.rename('33subdir3', 'subdir3');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir3']]);
  await driveClient.mkdir('subdir1');
  await driveClient.mkdir('subdir2');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'subdir3'],
    [FsObjectType.DIR, 'subdir1'],
    [FsObjectType.DIR, 'subdir2'],
  ]);
  await driveClient.rename('/subdir3', 'subdir1/subdir3New');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'subdir1'],
    [FsObjectType.DIR, 'subdir2'],
  ]);
  expect(driveClient.ls('subdir1').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'subdir3New']]);
  await driveClient.mkdir('subdir1/subdir3New/S');
  driveClient.cd('subdir1');
  await driveClient.rename('subdir3New', '/subdir3');
  expect(driveClient.ls('/').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'subdir1'],
    [FsObjectType.DIR, 'subdir2'],
    [FsObjectType.DIR, 'subdir3'],
  ]);
  driveClient.cd('/');
  expect(driveClient.ls('subdir3').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'S']]);
  await driveClient.rename('subdir3/S', '/s');
  expect(driveClient.ls('/').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'subdir1'],
    [FsObjectType.DIR, 'subdir2'],
    [FsObjectType.DIR, 'subdir3'],
    [FsObjectType.DIR, 's'],
  ]);
  let opsRes = await driveClient.rm(['subdir1', 'subdir2', 'subdir3']);
  expect(opsRes.length).toBe(3);
  await driveClient.rename('s', 'DS');
  expect(driveClient.ls('/').map((e) => [e.type, e.name])).toStrictEqual([[FsObjectType.DIR, 'DS']]);
  await expect(driveClient.rename('/', 's/d')).rejects.toThrowError('Target cannot be changed');
});

test('Rename test', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('dir1');
  await driveClient.rename('dir1', 'dir2');
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'dir2']
  ]);
  await expect(async () => await driveClient.rename('dir2', '/dir2/dir1')).rejects.toThrowError('Can\'t move directory into itself');
});

test('Operation in copied directory does not affect source directory', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('sourceDir');
  await driveClient.mkdir('sourceDir/subDir');
  let opsRes = await driveClient.cp('', ['sourceDir'], '/', 'RENAME');
  expect(opsRes.length).toBe(1);

  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['sourceDir', 'sourceDir (1)']);
  expect(driveClient.ls('/sourceDir').map((e) => e.name)).toStrictEqual(['subDir']);
  expect(driveClient.ls('/sourceDir (1)').map((e) => e.name)).toStrictEqual(['subDir']);

  await driveClient.mkdir('/sourceDir (1)/newSubDir');
  expect(driveClient.ls('/sourceDir (1)').map((e) => e.name)).toStrictEqual(['subDir', 'newSubDir']);
  expect(driveClient.ls('/sourceDir').map((e) => e.name)).toStrictEqual(['subDir']);

  opsRes = await driveClient.rm(['/sourceDir (1)/subDir']);
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('/sourceDir (1)').map((e) => e.name)).toStrictEqual(['newSubDir']);
  expect(driveClient.ls('/sourceDir').map((e) => e.name)).toStrictEqual(['subDir']);
});

test('Complex test: cp, rename, rm, mkdir, ls, cd', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('Some directory');
  await driveClient.mkdir('Some directory/New one');
  let opsRes = await driveClient.cp('Some directory', ['New one'], '/', 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'Some directory'],
    [FsObjectType.DIR, 'New one'],
  ]);
  expect(driveClient.ls("Some directory").map(e => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, "New one"]
  ]);
  opsRes = await driveClient.cp('/', ['Some directory'], 'New one/', 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, 'Some directory'],
    [FsObjectType.DIR, 'New one']
  ]);
  expect(driveClient.ls('New one').map((e) => [e.type, e.name])).toStrictEqual([
    [FsObjectType.DIR, "Some directory"]
  ]);
  expect(driveClient.ls('Some directory/New one').map((e) => [e.type, e.name])).toStrictEqual([]);
});

test('Cp non-existing directory throws an error', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('dir1');
  await expect(driveClient.cp('dir1', ['dir1'], '/dir1', 'RENAME')).rejects.toThrowError('File or directory "dir1" does not exist in source path');
});

test('Cp directory into itself throws an error', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('dir1');
  await expect(driveClient.cp('', ['dir1'], '/dir1', 'RENAME')).rejects.toThrowError('Cannot move or copy a directory into itself or its subdirectory');
});

test('Cp directory into its subdirectory throws an error', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('dir');
  await driveClient.mkdir('dir/subdir');
  await expect(driveClient.cp('/', ['dir'], '/dir/subdir', 'RENAME')).rejects.toThrowError('Cannot move or copy a directory into itself or its subdirectory');
});

test('Cp adds (1) and so on when there is name collision for directory', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('dir1');
  let opsRes = await driveClient.cp('/', ['dir1'], '/', 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['dir1', 'dir1 (1)']);

  opsRes = await driveClient.cp('', ['dir1'], '/', 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['dir1', 'dir1 (1)', 'dir1 (2)']);
});

test('Cp adds (1) and so on when there is name collision for files with extensions', async () => {
  const driveClient = await getTestDriveClient();
  await uploadTestFile("/", "original_file.txt", "test data for upload and copy", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["original_file.txt"]);
  let opsRes = await driveClient.cp('/', ['original_file.txt'], '/', 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['original_file.txt', 'original_file (1).txt'])
  opsRes = await driveClient.cp('', ['original_file.txt'], '/', 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['original_file.txt', 'original_file (1).txt', 'original_file (2).txt']);
});

test('Cp multiple directories in one operation', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('dir1');
  await driveClient.mkdir('dir2');
  await driveClient.mkdir('dir3');
  await driveClient.mkdir('destination');
  let opsRes = await driveClient.cp('/', ['dir1', 'dir2', 'dir3'], '/destination', 'RENAME');
  expect(opsRes.length).toBe(3);
  expect(driveClient.ls('/destination').map((e) => e.name)).toStrictEqual(['dir1', 'dir2', 'dir3']);
});

test('Cp to non-existing directory throws error', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir('dir1');
  await expect(driveClient.cp('', ['dir1'], '/nonexistent', 'RENAME')).rejects.toThrowError('Destination does not exist');
});

test('Upload file', async () => {
  const fileData = "asdfas034034 adskfjasdkfjpiwqoije,zzmcxvmADfa";
  const driveClient = await getTestDriveClient();
  await uploadTestFile("/", "test_file.txt", fileData, driveClient);
  expect(driveClient.ls("/").length).toBe(1);
  const properties = driveClient.ls("/")[0].properties as FsFileProperties;
  expect(properties).not.toBe(undefined);
  const downloadedFileData = await driveClient.getFileData(properties.byteOffset, properties.byteLength, properties.contentHash!);
  expect(downloadedFileData.length).toBe(fileData.length);
  const decoded = (new TextDecoder()).decode(downloadedFileData);
  expect(decoded).toBe(fileData);

  const fileData2 = "0993523452345joiadjf +++++ ___";
  await uploadTestFile("/", "test_file2.txt", fileData2, driveClient);
  expect(driveClient.ls("/").length).toBe(2);

  await driveClient.mkdir("/directory")
  await driveClient.rename("test_file2.txt", "/directory/test_file2.txt")
  expect(driveClient.ls("/directory").length).toBe(1);
  const properties2 = driveClient.ls("/directory/")[0].properties as FsFileProperties;
  const downloadedFileData2 = await driveClient.getFileData(properties2.byteOffset, properties2.byteLength, properties2.contentHash!);
  expect(downloadedFileData2.length).toBe(fileData2.length);
  const decoded2 = (new TextDecoder()).decode(downloadedFileData2);
  expect(decoded2).toBe(fileData2);
});

test('Download file', async () => {
  const fileData = "asdfas034034 adskfjasdkfjpiwqoije,zzmcxvmADf";
  const driveClient = await getTestDriveClient();
  await uploadTestFile("/", "test_file.txt", fileData, driveClient);

  expect(driveClient.ls("/").length).toBe(1);

  const fileData2 = "0993523452345joiadjf +++++ ___";
  await uploadTestFile("/", "test_file2.txt", fileData2, driveClient);

  expect(driveClient.ls("/").length).toBe(2);

  const [node1, node2] = driveClient.ls("/")
  const properties1 = node1.properties as FsFileProperties;
  const properties2 = node2.properties as FsFileProperties;

  const downloadedFileData1 = await driveClient.getFileData(properties1.byteOffset, properties1.byteLength, properties1.contentHash!);
  const downloadedFileData2 = await driveClient.getFileData(properties2.byteOffset, properties2.byteLength, properties2.contentHash!);

  expect(downloadedFileData1.length).toBe(fileData.length);
  expect(downloadedFileData2.length).toBe(fileData2.length);

})

// TODO: unfinished
test('Validate names', async () => {
  const driveClient = await getTestDriveClient();
  await expect(driveClient.mkdir('M<.')).rejects.toThrowError('Invalid name: M<.');
});

test('Download file', async () => {
  const fileData = "asdfas034034 adskfjasdkfjpiwqoije,zzmcxvmADf";
  const driveClient = await getTestDriveClient();
  await uploadTestFile("/", "test_file.txt", fileData, driveClient);

  expect(driveClient.ls("/").length).toBe(1);

  const fileData2 = "0993523452345joiadjf +++++ ___";
  await uploadTestFile("/", "test_file2.txt", fileData2, driveClient);
  expect(driveClient.ls("/").length).toBe(2);

  const [node1, node2] = driveClient.ls("/")
  const properties1 = node1.properties as FsFileProperties;
  const properties2 = node2.properties as FsFileProperties;

  const downloadedFileData1 = await driveClient.getFileData(properties1.byteOffset, properties1.byteLength, properties1.contentHash!);
  const downloadedFileData2 = await driveClient.getFileData(properties2.byteOffset, properties2.byteLength, properties2.contentHash!);

  expect(downloadedFileData1.length).toBe(fileData.length);
  expect(downloadedFileData2.length).toBe(fileData2.length);
});


function getRandomArray(len: number): Array<number> {
  const arr = [];
  for (let i = 0; i < len; i++) {
    arr.push(Math.floor(Math.random() * 256));
  }
  return arr;
}

export function checkEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length != b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] != b[i]) return false;
  return true;
}

test('Upload data test', async () => {
  const driveClient = await getTestDriveClient();
  const len1 = 49 * 2564 + 23;
  const fileData1 = new Uint8Array(getRandomArray(len1));
  const len2 = 100 * 100;
  const fileData2 = new Uint8Array(getRandomArray(len2));
  await uploadTestFile("/", "file1.dat", fileData1, driveClient);
  await uploadTestFile("/", "file2.dat", fileData2, driveClient);

  let props = driveClient.ls("/")[0].properties as FsFileProperties;
  let downloadedFileData = await driveClient.getFileData(props.byteOffset, props.byteLength, props.contentHash!);
  expect(downloadedFileData.length).toBe(len1);
  expect(checkEqual(downloadedFileData, fileData1)).toBe(true);

  props = driveClient.ls("/")[1].properties as FsFileProperties;
  downloadedFileData = await driveClient.getFileData(props.byteOffset, props.byteLength, props.contentHash!);
  expect(downloadedFileData.length).toBe(len2);
  expect(checkEqual(downloadedFileData, fileData2)).toBe(true);

});

test('Copying non-existing directory throws an error', async () => {
  const driveClient = await getTestDriveClient();
  await expect(driveClient.cp('nonexistent', ['nonexistent'], '/', 'REPLACE')).rejects.toThrowError('Source does not exist');
});

test('Upload file, copy it, then download', async () => {
  const fileData = "test data for upload and copy";
  const driveClient = await getTestDriveClient();

  // Upload the file
  await uploadTestFile("/", "original_file.txt", fileData, driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["original_file.txt"]);

  // Copy the file
  let opsRes = await driveClient.cp("/", ["original_file.txt"], "/", 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["original_file.txt", "original_file (1).txt"]);

  // Download the original file
  const originalFileProps = driveClient.ls("/").find(e => e.name === "original_file.txt")!.properties as FsFileProperties;
  const originalFileData = await driveClient.getFileData(originalFileProps.byteOffset, originalFileProps.byteLength, originalFileProps.contentHash!);
  expect((new TextDecoder()).decode(originalFileData)).toBe(fileData);

  // Download the copied file
  const copiedFileProps = driveClient.ls("/").find(e => e.name === "original_file (1).txt")!.properties as FsFileProperties;
  const copiedFileData = await driveClient.getFileData(copiedFileProps.byteOffset, copiedFileProps.byteLength, copiedFileProps.contentHash!);
  expect((new TextDecoder()).decode(copiedFileData)).toBe(fileData);
});

test('Copying deleted file throws an error', async () => {
  const fileData = "test data for upload and delete";
  const driveClient = await getTestDriveClient();

  // Upload the file
  await uploadTestFile("/", "temp_file.txt", fileData, driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["temp_file.txt"]);

  // Delete the file
  let opsRes = await driveClient.rm(["temp_file.txt"]);
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls("/").length).toBe(0);

  // Attempt to copy the deleted file
  await expect(driveClient.cp("/", ["temp_file.txt"], "/", 'RENAME')).rejects.toThrowError('File or directory "temp_file.txt" does not exist in source path');
});

test('Copying non-existing file throws an error', async () => {
  const driveClient = await getTestDriveClient();
  await expect(driveClient.cp('nonexistent', ['nonexistent'], '/', 'RENAME')).rejects.toThrowError('Source does not exist');
});

test('Copying deleted directory throws an error', async () => {
  const driveClient = await getTestDriveClient();

  // Create and verify the directory
  await driveClient.mkdir('temp_dir');
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["temp_dir"]);

  // Delete the directory
  let opsRes = await driveClient.rm(["temp_dir"]);
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls("/").length).toBe(0);

  // Attempt to copy the deleted directory
  await expect(driveClient.cp("/", ["temp_dir"], "/", 'RENAME')).rejects.toThrowError('File or directory "temp_dir" does not exist in source path');
});

test('Copy directory, navigate to it with cdByDirId, and list contents', async () => {
  const driveClient = await getTestDriveClient();

  // Create a directory with subdirectories
  await driveClient.mkdir('sourceDir');
  await driveClient.mkdir('sourceDir/subDir1');
  await driveClient.mkdir('sourceDir/subDir2');

  // Copy the directory
  await driveClient.cp('/', ['sourceDir'], '/', 'RENAME');
  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['sourceDir', 'sourceDir (1)']);

  // Navigate to the copied directory using cdByDirId
  const copiedDirNode = driveClient.ls('/').find((e) => e.name === 'sourceDir (1)')!;
  driveClient.cdByDirId(copiedDirNode.id);
  expect(driveClient.pwd()).toBe('/sourceDir (1)');

  // List contents of the copied directory
  expect(driveClient.ls('').map((e) => e.name)).toStrictEqual(['subDir1', 'subDir2']);
});

test('Copy directory, modify copied directory, and verify original remains unchanged', async () => {
  const driveClient = await getTestDriveClient();

  // Create a directory with a subdirectory
  await driveClient.mkdir('originalDir');
  await driveClient.mkdir('originalDir/subDir');

  // Copy the original directory
  await driveClient.cp('/', ['originalDir'], '/', 'RENAME');
  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['originalDir', 'originalDir (1)']);

  // Delete the subdirectory in the copied directory
  const copiedDirNode = driveClient.ls('/').find((e) => e.name === 'originalDir (1)')!;
  driveClient.cdByDirId(copiedDirNode.id);
  expect(driveClient.ls('').map((e) => e.name)).toStrictEqual(['subDir']);
  expect(driveClient.ls('/originalDir (1)').map((e) => e.name)).toStrictEqual(['subDir']);
  let opsRes = await driveClient.rm(['subDir']);
  expect(opsRes.length).toBe(1);

  // Verify the copied directory is modified
  expect(driveClient.ls('').map((e) => e.name)).toStrictEqual([]);

  // Verify the original directory remains unchanged
  driveClient.cd('/');
  const originalDirNode = driveClient.ls('/').find((e) => e.name === 'originalDir')!;
  driveClient.cdByDirId(originalDirNode.id);
  expect(driveClient.ls('').map((e) => e.name)).toStrictEqual(['subDir']);
});

test('Copy directory, modify subdirectory in copied directory, and verify original remains unchanged', async () => {
  const driveClient = await getTestDriveClient();

  // Create a directory with a subdirectory
  await driveClient.mkdir('originalDir');
  await driveClient.mkdir('originalDir/subDir');

  // Copy the original directory
  await driveClient.cp('/', ['originalDir'], '/', 'RENAME');
  expect(driveClient.ls('/').map((e) => e.name)).toStrictEqual(['originalDir', 'originalDir (1)']);

  // Navigate to the subdirectory in the copied directory and create a new directory
  const copiedDirNode = driveClient.ls('/').find((e) => e.name === 'originalDir (1)')!;
  driveClient.cdByDirId(copiedDirNode.id);
  const subDirNode = driveClient.ls('').find((e) => e.name === 'subDir')!;
  driveClient.cdByDirId(subDirNode.id);
  await driveClient.mkdir('newSubDir');
  expect(driveClient.ls('').map((e) => e.name)).toStrictEqual(['newSubDir']);

  // Verify the original directory remains unchanged
  driveClient.cd('/');
  const originalDirNode = driveClient.ls('/').find((e) => e.name === 'originalDir')!;
  driveClient.cdByDirId(originalDirNode.id);
  const originalSubDirNode = driveClient.ls('').find((e) => e.name === 'subDir')!;
  driveClient.cdByDirId(originalSubDirNode.id);
  expect(driveClient.ls('').map((e) => e.name)).toStrictEqual([]);
});

test('Move file to another directory', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file.txt", "test data for move", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Move the file
  await driveClient.mv("/", ["test_file.txt"], "/destination", "REPLACE");
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["test_file.txt"]);
});

test('Move directory to another directory', async () => {
  const driveClient = await getTestDriveClient();

  // Create a source directory with a subdirectory
  await driveClient.mkdir("sourceDir");
  await driveClient.mkdir("sourceDir/subDir");
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["sourceDir"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Move the source directory
  let opsRes = await driveClient.mv("/", ["sourceDir"], "/destination", "REPLACE");
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["sourceDir"]);
  expect(driveClient.ls("/destination/sourceDir").map((e) => e.name)).toStrictEqual(["subDir"]);
});

test('Move multiple files to another directory', async () => {
  const driveClient = await getTestDriveClient();

  // Upload multiple files
  await uploadTestFile("/", "file1.txt", "file1 data", driveClient);
  await uploadTestFile("/", "file2.txt", "file2 data", driveClient);

  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["file1.txt", "file2.txt"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Move the files
  let opsRes = await driveClient.mv("/", ["file1.txt", "file2.txt"], "/destination", "REPLACE");
  expect(opsRes.length).toBe(2);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["file1.txt", "file2.txt"]);
});

test('Move to non-existing directory throws error', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file.txt", "test data for move", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Attempt to move the file to a non-existing directory
  await expect(driveClient.mv("/", ["test_file.txt"], "/nonexistent", "REPLACE")).rejects.toThrowError('Destination does not exist');
});

test('Move non-existing file throws error', async () => {
  const driveClient = await getTestDriveClient();
  await driveClient.mkdir("destination");
  // Attempt to move a non-existing file
  await expect(driveClient.mv("/", ["nonexistent.txt"], "/destination", "REPLACE")).rejects.toThrowError('File or directory "nonexistent.txt" does not exist in source path');
});

test('Move file overwrites existing file in destination', async () => {
  const driveClient = await getTestDriveClient();

  // Upload two files with the same name
  await uploadTestFile("/", "test_file.txt", "original file data", driveClient);
  await driveClient.mkdir("destination");
  await uploadTestFile("/destination", "test_file.txt", "new file data", driveClient);

  // Move the file
  let opsRes = await driveClient.mv("/", ["test_file.txt"], "/destination", "REPLACE");
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Verify the file in the destination is the moved file
  const fileProps = driveClient.ls("/destination")[0].properties as FsFileProperties;
  const downloadedFileData = await driveClient.getFileData(fileProps.byteOffset, fileProps.byteLength, fileProps.contentHash!);
  expect((new TextDecoder()).decode(downloadedFileData)).toBe("original file data");
});

async function testUploadCopyMove(moveMode: "REPLACE" | "RENAME") {
  const driveClient = await getTestDriveClient();
  // Upload a file
  await uploadTestFile("/", "test_file.txt", "test data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Create a folder
  await driveClient.mkdir("folder");

  // Copy the file to the folder
  await driveClient.cp("/", ["test_file.txt"], "/folder", 'REPLACE');
  expect(driveClient.ls("/folder").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Move the copied file back to the root
  let opsRes = await driveClient.mv("/folder", ["test_file.txt"], "/", moveMode);
  expect(opsRes.length).toBe(1);

  // Verify the results
  const rootFiles = driveClient.ls("/").map((e) => e.name);
  if (moveMode === "REPLACE") {
    expect(rootFiles).toHaveLength(2);
    expect(rootFiles).toEqual(expect.arrayContaining(["test_file.txt", "folder"]));
  } else if (moveMode === "RENAME") {
    expect(rootFiles).toHaveLength(3);
    expect(rootFiles).toEqual(expect.arrayContaining(["test_file.txt", "test_file (1).txt", "folder"]));
  }
  expect(driveClient.ls("/folder").length).toBe(0);
}

test('Upload file, copy to folder, and move back', async () => {
  await testUploadCopyMove("REPLACE");
});

test('Upload file, copy to folder, and move back in RENAME mode', async () => {
  await testUploadCopyMove("RENAME");
});

test('Move multiple files in FIXED mode with specified names', async () => {
  const driveClient = await getTestDriveClient();

  // Upload multiple files
  await uploadTestFile("/", "file1.txt", "file1 data", driveClient);
  await uploadTestFile("/", "file2.txt", "file2 data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["file1.txt", "file2.txt"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Move the files in FIXED mode with new names
  let opsRes = await driveClient.mv("/", ["file1.txt", "file2.txt"], "/destination", "FIXED", ["renamed_file1.txt", "renamed_file2.txt"]);
  expect(opsRes.length).toBe(2);

  // Verify the results
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["renamed_file1.txt", "renamed_file2.txt"]);
});

test('Move file in FIXED mode with specified names', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file.txt", "test data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Move the file in FIXED mode with a new name
  let opsRes = await driveClient.mv("/", ["test_file.txt"], "/destination", "FIXED", ["renamed_file.txt"]);
  expect(opsRes.length).toBe(1);

  // Verify the results
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["renamed_file.txt"]);
});

test('Move multiple files in FIXED mode with specified names', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file1.txt", "test data", driveClient);
  await uploadTestFile("/", "test_file2.txt", "test data", driveClient);
  await uploadTestFile("/", "test_file3.txt", "test data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file1.txt", "test_file2.txt", "test_file3.txt"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Move the file in FIXED mode with a new name
  let opsRes = await driveClient.mv("/", ["test_file1.txt", "test_file2.txt", "test_file3.txt"], "/destination", "FIXED", ["renamed_file1.txt", "renamed_file2.txt", "renamed_file3.txt"]);
  expect(opsRes.length).toBe(3);

  // Verify the results
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["renamed_file1.txt", "renamed_file2.txt", "renamed_file3.txt"]);
});

test('Move multiple files in FIXED mode with collision names throws', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file1.txt", "test data", driveClient);
  await uploadTestFile("/", "test_file2.txt", "test data", driveClient);
  await uploadTestFile("/", "test_file3.txt", "test data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file1.txt", "test_file2.txt", "test_file3.txt"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Move the file in FIXED mode with new names that collide
  await expect(driveClient.mv("/", ["test_file1.txt", "test_file2.txt", "test_file3.txt"], "/destination", "FIXED", ["renamed_file1.txt", "renamed_file2.txt", "renamed_file2.txt"]))
    .rejects.toThrowError("destFileNames must have unique names");
  });

test('Upload file, copy to folder, and move back in FIXED mode', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file.txt", "test data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Create a folder
  await driveClient.mkdir("folder");

  // Copy the file to the folder
  let opsRes = await driveClient.cp("/", ["test_file.txt"], "/folder", 'RENAME');
  expect(opsRes.length).toBe(1);
  expect(driveClient.ls("/folder").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Move the copied file back to the root in FIXED mode
  opsRes = await driveClient.mv("/folder", ["test_file.txt"], "/", "FIXED", ["test_file_fixed.txt"]);
  expect(opsRes.length).toBe(1);

  // Verify the results
  const rootFiles = driveClient.ls("/").map((e) => e.name);
  expect(rootFiles).toEqual(expect.arrayContaining(["test_file.txt", "test_file_fixed.txt", "folder"]));
  expect(driveClient.ls("/folder").length).toBe(0);
});

test('Cp in REPLACE mode overwrites existing files or directories', async () => {
  const driveClient = await getTestDriveClient();

  // Create a directory and a file
  await driveClient.mkdir('dir1');
  await uploadTestFile('/', 'file1.txt', 'original data', driveClient);

  // Create a destination directory with the same names
  await driveClient.mkdir('destination');
  await driveClient.mkdir('destination/dir1');
  await uploadTestFile('/destination', 'file1.txt', 'existing data', driveClient);

  // Copy in REPLACE mode
  let opsRes = await driveClient.cp('/', ['dir1', 'file1.txt'], '/destination', 'REPLACE');
  expect(opsRes.length).toBe(2);

  // Verify the results
  expect(driveClient.ls('/destination').map((e) => e.name)).toStrictEqual(['dir1', 'file1.txt']);

  // Verify the file content was replaced
  const fileProps = driveClient.ls('/destination').find(e => e.name === 'file1.txt')!.properties as FsFileProperties;
  const downloadedFileData = await driveClient.getFileData(fileProps.byteOffset, fileProps.byteLength, fileProps.contentHash!);
  expect((new TextDecoder()).decode(downloadedFileData)).toBe('original data');
});

test('Copy files with specified destination names', async () => {
  const driveClient = await getTestDriveClient();

  // Upload multiple files
  await uploadTestFile("/", "file1.txt", "file1 data", driveClient);
  await uploadTestFile("/", "file2.txt", "file2 data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["file1.txt", "file2.txt"]);

  // Create a destination directory
  await driveClient.mkdir("destination");

  // Copy the files with specified destination names
  let opsRes = await driveClient.cp("/", ["file1.txt", "file2.txt"], "/destination", 'FIXED', ["copied_file1.txt", "copied_file2.txt"]);
  expect(opsRes.length).toBe(2);

  // Verify the results
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["file1.txt", "file2.txt", "destination"]);
  expect(driveClient.ls("/destination").map((e) => e.name)).toStrictEqual(["copied_file1.txt", "copied_file2.txt"]);

  // Download and validate the copied files
  const copiedFile1Props = driveClient.ls("/destination").find(e => e.name === "copied_file1.txt")!.properties as FsFileProperties;
  const copiedFile2Props = driveClient.ls("/destination").find(e => e.name === "copied_file2.txt")!.properties as FsFileProperties;

  const copiedFile1Data = await driveClient.getFileData(copiedFile1Props.byteOffset, copiedFile1Props.byteLength, copiedFile1Props.contentHash!);
  const copiedFile2Data = await driveClient.getFileData(copiedFile2Props.byteOffset, copiedFile2Props.byteLength, copiedFile2Props.contentHash!);

  expect((new TextDecoder()).decode(copiedFile1Data)).toBe("file1 data");
  expect((new TextDecoder()).decode(copiedFile2Data)).toBe("file2 data");
});

test('Conflicting uploads in RENAME mode', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file.txt", "test data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Attempt to upload the same file in RENAME mode
  let opsRes = await driveClient.uploadFile(new File(["new data"], "test_file.txt"), "/", 'RENAME');
  // check tath opsRes is a string
  expect(typeof opsRes).toBe('string');
  console.log(driveClient.ls("/").map((e) => e.name))
  expect(driveClient.ls("/").map((e) => e.name)).toEqual(expect.arrayContaining(["test_file.txt", "test_file (1).txt"]));

  // Verify the content of the original file remains unchanged
  const originalFileProps = driveClient.ls("/").find(e => e.name === "test_file.txt")!.properties as FsFileProperties;
  const originalFileData = await driveClient.getFileData(originalFileProps.byteOffset, originalFileProps.byteLength, originalFileProps.contentHash!);
  expect((new TextDecoder()).decode(originalFileData)).toBe("test data");

  // Verify the content of the renamed file
  const renamedFileProps = driveClient.ls("/").find(e => e.name === "test_file (1).txt")!.properties as FsFileProperties;
  const renamedFileData = await driveClient.getFileData(renamedFileProps.byteOffset, renamedFileProps.byteLength, renamedFileProps.contentHash!);
  expect((new TextDecoder()).decode(renamedFileData)).toBe("new data");
});

test('Conflicting uploads in REPLACE mode', async () => {
  const driveClient = await getTestDriveClient();

  // Upload a file
  await uploadTestFile("/", "test_file.txt", "test data", driveClient);
  expect(driveClient.ls("/").map((e) => e.name)).toStrictEqual(["test_file.txt"]);

  // Attempt to upload the same file in REPLACE mode
  let opsRes = await driveClient.uploadFile(new File(["new data"], "test_file.txt"), "/", 'REPLACE');
  expect(typeof opsRes).toBe('string');
  expect(driveClient.ls("/").map((e) => e.name)).toEqual(expect.arrayContaining(["test_file.txt"]));

  // Verify the content of the file is replaced
  const fileProps = driveClient.ls("/")[0].properties as FsFileProperties;
  const fileData = await driveClient.getFileData(fileProps.byteOffset, fileProps.byteLength, fileProps.contentHash!);
  expect((new TextDecoder()).decode(fileData)).toBe("new data");
});

async function uploadTestFile(path: string, fileName: string, fileData: string | Uint8Array, driveClient: DriveClient, mode: FsOperationNameConflictMode = 'REPLACE') {
  const blob = new Blob([fileData], { type: 'text' });
  (blob as any)["name"] = fileName;
  const file = <File>blob;
  return driveClient.uploadFile(file, path, mode);
}

