import { getTestUserId } from "@/engine/backend/test/mocks/test-user-info";
import { test, expect } from "vitest";
import { RmFsOperation, MkDirFsOperation } from "../fs-operation";
import { FsOperationWrapper, RejectionReason } from "../ops-repository";
import { getTimestampingOpsRepository } from "./implementations/timestamping-ops-repository-test-impl";



test('Empty drive returns empty result', async () => {
    const {timestampingOpsRepository} = await getTimestampingOpsRepository();
    const opsArray = await timestampingOpsRepository.getOperations();
    expect(opsArray).toStrictEqual([]);
});

test('Save operation then get operation, timestamp info is filled in', async () => {
    const {timestampingOpsRepository} = await getTimestampingOpsRepository();
    const op = new RmFsOperation(getTestUserId(), '/', ['file1.txt', 'file2.txt']);
    await timestampingOpsRepository.saveOperation(op);
    const opsArray = await timestampingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op, valid: true}
    ]);
    expect(op.tsaId).toBeTypeOf('string');
    expect(op.tsaId).not.toBeNull();
    expect(op.tsaId!.length).toBeGreaterThan(0);
    expect(op.timestamp).toBeTypeOf('number');
    expect(op.timestamp).toBeGreaterThan(0);
    expect(op.timestampSig).toBeTypeOf('string');
    expect(op.timestampSig).not.toBeNull();
    expect(op.timestampSig!.length).toBeGreaterThan(0);
});

test('Save and get multiple operations', async () => {
    const {timestampingOpsRepository} = await getTimestampingOpsRepository();
    const userId = getTestUserId();
    const op1 = new MkDirFsOperation(userId, '/');
    const op2 = new MkDirFsOperation(userId, '/1');
    await timestampingOpsRepository.saveOperation(op1);
    await timestampingOpsRepository.saveOperation(op2);
    const opsArray = await timestampingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op: op1, valid: true},
        {opStr: "", op: op2, valid: true}
    ]);
    expect(op1.tsaId).toBeTypeOf('string');
    expect(op1.tsaId).not.toBeNull();
    expect(op1.tsaId!.length).toBeGreaterThan(0);
    expect(op1.timestamp).toBeTypeOf('number');
    expect(op1.timestamp).toBeGreaterThan(0);
    expect(op1.timestampSig).toBeTypeOf('string');
    expect(op1.timestampSig).not.toBeNull();
    expect(op1.timestampSig!.length).toBeGreaterThan(0);
    expect(op2.tsaId).toBeTypeOf('string');
    expect(op2.tsaId).not.toBeNull();
    expect(op2.tsaId!.length).toBeGreaterThan(0);
    expect(op2.timestamp).toBeTypeOf('number');
    expect(op2.timestamp).toBeGreaterThan(0);
    expect(op2.timestampSig).toBeTypeOf('string');
    expect(op2.timestampSig).not.toBeNull();
    expect(op2.timestampSig!.length).toBeGreaterThan(0);
});

test('Save and get multiple operations 2', async () => {
    const {timestampingOpsRepository} = await getTimestampingOpsRepository();
    const signingOpsRepository = Reflect.get(timestampingOpsRepository, "signingOpsRepository");
    const userId = getTestUserId();
    const op1 = new MkDirFsOperation(userId, '/dir1');
    await signingOpsRepository.saveOperation(op1);
    let opsArray = await signingOpsRepository.getOperations();
    opsArray.forEach((e: FsOperationWrapper) => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op: op1, valid: true}
    ]);
    const op2 = new MkDirFsOperation(userId, '/dir2');
    opsArray = await timestampingOpsRepository.getOperations(0, '');
    opsArray.forEach((e: FsOperationWrapper) => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op: op1, valid: false, rejectionReason: RejectionReason.INVALID_TIMESTAMP}
    ]);
    await timestampingOpsRepository.saveOperation(op2);
    opsArray = await timestampingOpsRepository.getOperations(0, '');
    opsArray.forEach((e: FsOperationWrapper) => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op: op1, valid: false, rejectionReason: RejectionReason.INVALID_TIMESTAMP},
        {opStr: "", op: op2, valid: true}
    ]);
    opsArray = await signingOpsRepository.getOperations(0, '');
    opsArray.forEach((e: FsOperationWrapper) => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op: op1, valid: true},
        {opStr: "", op: op2, valid: true}
    ]);
    const op3 = new RmFsOperation(userId, '/', ['dir1']);
    op3.tsaId = op2.tsaId;
    op3.timestamp = Date.now();
    op3.timestampSig = op2.timestampSig;
    await signingOpsRepository.saveOperation(op3);
    opsArray = await signingOpsRepository.getOperations(0, '');
    opsArray.forEach((e: FsOperationWrapper) => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op: op1, valid: true},
        {opStr: "", op: op2, valid: true},
        {opStr: "", op: op3, valid: true}
    ]);
    opsArray = await timestampingOpsRepository.getOperations(0, '');
    opsArray.forEach((e: FsOperationWrapper) => e.opStr = "");
    expect(opsArray).toMatchObject([
        {opStr: "", op: op1, valid: false, rejectionReason: RejectionReason.INVALID_TIMESTAMP},
        {opStr: "", op: op2, valid: true},
        {opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_TIMESTAMP}
    ]);
});
