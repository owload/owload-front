import { test, expect } from "vitest";
import { MkDirFsOperation, RmFsOperation, FsOperation } from "../fs-operation";
import { HashValidatingOpsRepository } from "../hash-validating-ops-repository";
import { RejectionReason } from "../ops-repository";
import { getHashValidatingOpsRepository, getParallelHashValidatingOpsRepositories } from "./implementations/hash-validating-ops-repository-test-impl";


test('saveOperation succeeds', async () => {
    const { hashValidatingOpsRepository } = await getHashValidatingOpsRepository();
    const op = new MkDirFsOperation('1234-1234-1234', '/fsPath');
    await hashValidatingOpsRepository.saveOperation(op);
    await hashValidatingOpsRepository.saveOperation(op);
    const op2 = new RmFsOperation('1234-1234-1234', '/', ['fsPath']);
    await hashValidatingOpsRepository.saveOperation(op2);
});

test('Save multiple operations then get them', async () => {
    const { hashValidatingOpsRepository } = await getHashValidatingOpsRepository();
    const op1 = new MkDirFsOperation('1234-1234-1234', '/fsPath');
    await hashValidatingOpsRepository.saveOperation(op1);
    const op2 = new RmFsOperation('1234-1234-1234', '/', ['fsPath']);
    await hashValidatingOpsRepository.saveOperation(op2);
    const opsArray = await hashValidatingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true }
    ]);
});

test('Saved ops have correct hashes', async () => {
    const { hashValidatingOpsRepository } = await getHashValidatingOpsRepository();
    const op1 = new MkDirFsOperation('1234-1234-1234', '/fsPath');
    await hashValidatingOpsRepository.saveOperation(op1);
    const op2 = new RmFsOperation('1234-1234-a;do43o43', '/', ['fsPath2']);
    await hashValidatingOpsRepository.saveOperation(op2);
    const op3 = new MkDirFsOperation('1234', '/root/newDocment.pdf');
    await hashValidatingOpsRepository.saveOperation(op3);
    await hashValidatingOpsRepository.getOperations();
    expect(op1.previousOperationHash).equals('');
    expect(op2.previousOperationHash).equals(await op1.hashCode());
    expect(op3.previousOperationHash).equals(await op2.hashCode());
});

test('Save-get-save-get produces correct operations', async () => {
    const { hashValidatingOpsRepository } = await getHashValidatingOpsRepository();
    const op1 = new MkDirFsOperation('1234-1234-1234', '/fsPath');
    await hashValidatingOpsRepository.saveOperation(op1);
    let opsArray = await hashValidatingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true }
    ]);
    expect(op1.previousOperationHash).equals('');
    const op2 = new MkDirFsOperation('1234-1234', '/fsPath2');
    const op3 = new RmFsOperation('1234-1234', '/', ['fsPath']);
    await hashValidatingOpsRepository.saveOperation(op2);
    await hashValidatingOpsRepository.saveOperation(op3);
    opsArray = await hashValidatingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op2, valid: true },
        { opStr: "", op: op3, valid: true }
    ]);
    expect(op2.previousOperationHash).equals(await op1.hashCode());
    expect(op3.previousOperationHash).equals(await op2.hashCode());
    const op4 = new RmFsOperation('1234-542=34oooo4', '/', ['fsPath']);
    await hashValidatingOpsRepository.saveOperation(op4);
    opsArray = await hashValidatingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op4, valid: true }
    ]);
    expect(op4.previousOperationHash).equals(await op3.hashCode());
    opsArray = await hashValidatingOpsRepository.getOperations(0, '');
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op4, valid: true },
    ]);
});

test('Empty drive returns empty result', async () => {
    const { hashValidatingOpsRepository } = await getHashValidatingOpsRepository();
    const opsArray = await hashValidatingOpsRepository.getOperations();
    expect(opsArray).toStrictEqual([]);
});

async function saveWithWrongHash(
    hashValidatingOpsRepository: HashValidatingOpsRepository,
    op: FsOperation
): Promise<void> {
    const tmp = Reflect.get(hashValidatingOpsRepository, "lastSaveHash");
    Reflect.set(hashValidatingOpsRepository, "lastSaveHash", "__");
    await hashValidatingOpsRepository.saveOperation(op);
    Reflect.set(hashValidatingOpsRepository, "lastSaveHash", tmp);
}

test('Operations with wrong hash skipped', async () => {
    const { hashValidatingOpsRepository } = await getHashValidatingOpsRepository();
    const op1 = new MkDirFsOperation('1234-1234-1234', '/fsPath');
    await saveWithWrongHash(hashValidatingOpsRepository, op1);
    let opsArray = await hashValidatingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
    ]);
    await hashValidatingOpsRepository.saveOperation(op1);
    opsArray = await hashValidatingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
    ]);
    const op2 = new RmFsOperation('1234-542=34oooo4', '/', ['fsPath']);
    const op3 = new MkDirFsOperation('1234-542=34oooo4', '/fsPath/mao');
    await saveWithWrongHash(hashValidatingOpsRepository, op1);
    await saveWithWrongHash(hashValidatingOpsRepository, op2);
    await saveWithWrongHash(hashValidatingOpsRepository, op3);
    await hashValidatingOpsRepository.saveOperation(op2);
    await saveWithWrongHash(hashValidatingOpsRepository, op3);
    await hashValidatingOpsRepository.saveOperation(op3);
    await saveWithWrongHash(hashValidatingOpsRepository, op3);
    op3.previousOperationHash = await op2.hashCode();
    opsArray = await hashValidatingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    opsArray.forEach(e => e.op!.previousOperationHash = "");
    op1.previousOperationHash = op2.previousOperationHash = op3.previousOperationHash = "";
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op2, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op2, valid: true },
        { opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH }
    ]);
    opsArray = await hashValidatingOpsRepository.getOperations(0, '');
    opsArray.forEach(e => e.opStr = "");
    opsArray.forEach(e => e.op!.previousOperationHash = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op1, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op2, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op2, valid: true },
        { opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_PREV_OPERATION_HASH }
    ]);
});

test('If getOperations-saveOperations atomic, then no corruption happens with parallel writing', async () => {
    const [e1, e2] = await getParallelHashValidatingOpsRepositories();
    const hashValidatingOpsRepository1 = e1.hashValidatingOpsRepository;
    const hashValidatingOpsRepository2 = e2.hashValidatingOpsRepository;
    let opsArray = await hashValidatingOpsRepository1.getOperations();
    expect(opsArray).toStrictEqual([]);
    const op1 = new MkDirFsOperation('1', '/A');
    const op2 = new MkDirFsOperation('1', '/B');
    await hashValidatingOpsRepository1.saveOperation(op1);
    await hashValidatingOpsRepository1.saveOperation(op2);

    opsArray = await hashValidatingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true }
    ]);

    const op3 = new MkDirFsOperation('2', '/A/1');
    await hashValidatingOpsRepository2.saveOperation(op3);
    opsArray = await hashValidatingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", op: op3, valid: true }
    ]);

    const op4 = new RmFsOperation('1', '/', ['A']);
    await hashValidatingOpsRepository1.saveOperation(op4);
    opsArray = await hashValidatingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op4, valid: true }
    ]);

    opsArray = await hashValidatingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op4, valid: true }
    ]);

    const op5 = new RmFsOperation('2', '/', ['B']);
    await hashValidatingOpsRepository2.saveOperation(op5);
    opsArray = await hashValidatingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op5, valid: true }
    ]);

    opsArray = await hashValidatingOpsRepository1.getOperations(0, '');
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op4, valid: true },
        { opStr: "", op: op5, valid: true }
    ]);

    opsArray = await hashValidatingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op5, valid: true }
    ]);

    opsArray = await hashValidatingOpsRepository2.getOperations(0, '');
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op4, valid: true },
        { opStr: "", op: op5, valid: true }
    ]);
});

test('Corrupted block does not affect next ones', async () => {
    const [e1, e2] = await getParallelHashValidatingOpsRepositories();
    const hashValidatingOpsRepository1 = e1.hashValidatingOpsRepository;
    const hashValidatingOpsRepository2 = e2.hashValidatingOpsRepository;
    let opsArray = await hashValidatingOpsRepository1.getOperations();
    expect(opsArray).toStrictEqual([]);
    const op1 = new MkDirFsOperation('1', '/A');
    const op2 = new MkDirFsOperation('1', '/B');
    await hashValidatingOpsRepository1.saveOperation(op1);
    await hashValidatingOpsRepository1.saveOperation(op2);

    const op3 = new MkDirFsOperation('2', '/A/1');
    await hashValidatingOpsRepository2.saveOperation(op3);

    opsArray = await hashValidatingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
    ]);

    const op4 = new RmFsOperation('1', '/', ['A']);
    await hashValidatingOpsRepository1.saveOperation(op4);
    opsArray = await hashValidatingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op4, valid: true }
    ]);

    const op5 = new RmFsOperation('2', '/', ['B']);
    await hashValidatingOpsRepository2.saveOperation(op3);
    await hashValidatingOpsRepository2.saveOperation(op5);
    await hashValidatingOpsRepository2.saveOperation(op5);
    opsArray = await hashValidatingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: op4, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR }
    ]);

    await hashValidatingOpsRepository2.saveOperation(op3);
    await hashValidatingOpsRepository2.saveOperation(op5);
    opsArray = await hashValidatingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op5, valid: true }
    ]);

    opsArray = await hashValidatingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op5, valid: true }
    ]);

    opsArray = await hashValidatingOpsRepository1.getOperations(0, '');
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: op4, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op5, valid: true }
    ]);

    opsArray = await hashValidatingOpsRepository2.getOperations();
    expect(opsArray).toStrictEqual([]);
    opsArray = await hashValidatingOpsRepository2.getOperations(0, '');
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: op4, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: op3, valid: true },
        { opStr: "", op: op5, valid: true }
    ]);
});
