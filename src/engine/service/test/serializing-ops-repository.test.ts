

// TODO: concern serialization problems with different versions

import { test, expect } from "vitest";
import { MkDirFsOperation, RmFsOperation, FsOperation } from "../fs-operation";
import { RejectionReason } from "../ops-repository";
import { getSerializingOpsRepository, getParallelSerializingOpsRepositories } from "./implementations/serializing-ops-repository-test-impl";

const testMkOp1 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/');
const testMkOp2 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/dir/subdir');
const testMkOp3 = new MkDirFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/dir/subdir');
const testRmOp1 = new RmFsOperation('4f4d7b10-a600-471d-835d-627f26b3327c', '/dir/', ['subdir']);
const testRmOp2 = new RmFsOperation('', '/dir/dir/dir/DirectoryNew/', ['Files.Json.Docs.XML']);

function opByteLength(op: FsOperation) {
    return new TextEncoder().encode(op.serialize()).length;
}

test('saveOperation does not throw', async () => {
    const { serializingOpsRepository } = await getSerializingOpsRepository();
    await serializingOpsRepository.saveOperation(testMkOp1);
    await serializingOpsRepository.saveOperation(testMkOp3);
    await serializingOpsRepository.saveOperation(testRmOp1);
});

test('Empty drive returns empty result', async () => {
    const { serializingOpsRepository } = await getSerializingOpsRepository();
    const opsArray = await serializingOpsRepository.getOperations();
    expect(opsArray).toStrictEqual([]);
});

test('Save operation then get operation', async () => {
    const { serializingOpsRepository } = await getSerializingOpsRepository();
    await serializingOpsRepository.saveOperation(testMkOp3);
    const opsArray = await serializingOpsRepository.getOperations();
    const sl = serializingOpsRepository['splittingOpsRepository'].OPS_SEPARATOR_BYTE_LENGTH;
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toStrictEqual([{ opStr: "", op: testMkOp3, valid: true, startBytePos: sl, byteLength: opByteLength(testMkOp3) }]);
});

test('Save multiple operations then get them', async () => {
    const { serializingOpsRepository } = await getSerializingOpsRepository();
    await serializingOpsRepository.saveOperation(testMkOp1);
    await serializingOpsRepository.saveOperation(testMkOp2);
    const sl = serializingOpsRepository['splittingOpsRepository'].OPS_SEPARATOR_BYTE_LENGTH;
    let opsArray = await serializingOpsRepository.getOperations();
    expect(opsArray).toStrictEqual([
        { opStr: testMkOp1.serialize(), op: testMkOp1, valid: true, startBytePos: sl, byteLength: opByteLength(testMkOp1) },
        { opStr: testMkOp2.serialize(), op: testMkOp2, valid: true, startBytePos: opByteLength(testMkOp1) + 3*sl, byteLength: opByteLength(testMkOp2) }
    ]);
    await serializingOpsRepository.saveOperation(testMkOp1);
    opsArray = await serializingOpsRepository.getOperations();
    let pos = opByteLength(testMkOp1) + opByteLength(testMkOp2) + 5*sl;
    expect(opsArray).toStrictEqual([
        { opStr: testMkOp1.serialize(), op: testMkOp1, valid: true, startBytePos: pos, byteLength: opByteLength(testMkOp1) }
    ]);
    pos += opByteLength(testMkOp1) + 2*sl;
    await serializingOpsRepository.saveOperation(testRmOp1);
    await serializingOpsRepository.saveOperation(testRmOp1);
    await serializingOpsRepository.saveOperation(testRmOp2);
    opsArray = await serializingOpsRepository.getOperations();
    expect(opsArray).toStrictEqual([
        { opStr: testRmOp1.serialize(), op: testRmOp1, valid: true, startBytePos: pos, byteLength: opByteLength(testRmOp1) },
        { opStr: testRmOp1.serialize(), op: testRmOp1, valid: true, startBytePos: pos + opByteLength(testRmOp1) + 2*sl, byteLength: opByteLength(testRmOp1) },
        { opStr: testRmOp2.serialize(), op: testRmOp2, valid: true, startBytePos: pos + 2 * (opByteLength(testRmOp1) + 2*sl), byteLength: opByteLength(testRmOp2) }
    ]);
});

test('If getOperations-saveOperations atomic, then no corruption happens with parallel writing', async () => {
    const [e1, e2] = await getParallelSerializingOpsRepositories();
    const serializingOpsRepository1 = e1.serializingOpsRepository;
    const serializingOpsRepository2 = e2.serializingOpsRepository;
    let opsArray = await serializingOpsRepository1.getOperations();
    expect(opsArray).toStrictEqual([]);
    await serializingOpsRepository1.saveOperation(testMkOp1);
    await serializingOpsRepository1.saveOperation(testMkOp2);

    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testMkOp2, valid: true }
    ]);
    await serializingOpsRepository2.saveOperation(testMkOp3);

    opsArray = await serializingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testMkOp2, valid: true },
        { opStr: "", op: testMkOp3, valid: true }
    ]);
    await serializingOpsRepository1.saveOperation(testRmOp1);
    opsArray = await serializingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([{ opStr: "", op: testRmOp1, valid: true }]);


    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp3, valid: true },
        { opStr: "", op: testRmOp1, valid: true }
    ]);
    await serializingOpsRepository2.saveOperation(testRmOp2);

    opsArray = await serializingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([{ opStr: "", op: testRmOp2, valid: true }]);
    opsArray = await serializingOpsRepository1.getOperations(0);
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testMkOp2, valid: true },
        { opStr: "", op: testMkOp3, valid: true },
        { opStr: "", op: testRmOp1, valid: true },
        { opStr: "", op: testRmOp2, valid: true }
    ]);

    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    opsArray = await serializingOpsRepository2.getOperations(0);
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testMkOp2, valid: true },
        { opStr: "", op: testMkOp3, valid: true },
        { opStr: "", op: testRmOp1, valid: true },
        { opStr: "", op: testRmOp2, valid: true }
    ]);
});

test('Corrupted block does not affect next ones', async () => {
    const [e1, e2] = await getParallelSerializingOpsRepositories();
    const serializingOpsRepository1 = e1.serializingOpsRepository;
    const serializingOpsRepository2 = e2.serializingOpsRepository;
    let opsArray = await serializingOpsRepository1.getOperations();
    expect(opsArray).toMatchObject([]);
    await serializingOpsRepository1.saveOperation(testMkOp1);
    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([{ opStr: "", op: testMkOp1, valid: true }]);
    await serializingOpsRepository1.saveOperation(testMkOp2);

    await serializingOpsRepository2.saveOperation(testMkOp3);
    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR }
    ]);

    await serializingOpsRepository2.saveOperation(testMkOp3);
    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp3, valid: true }
    ]);

    await serializingOpsRepository1.saveOperation(testRmOp1);
    await serializingOpsRepository2.saveOperation(testRmOp2);
    opsArray = await serializingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");

    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testMkOp2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: testMkOp3, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR }
    ]);

    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR }
    ]);

    await serializingOpsRepository1.saveOperation(testRmOp1);
    await serializingOpsRepository2.saveOperation(testRmOp2);
    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testRmOp1, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR }
    ]);
    opsArray = await serializingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testRmOp1, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR }
    ]);

    await serializingOpsRepository2.saveOperation(testRmOp2);
    opsArray = await serializingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testRmOp2, valid: true }
    ]);
    opsArray = await serializingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testRmOp2, valid: true }
    ]);
    opsArray = await serializingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([]);

    opsArray = await serializingOpsRepository1.getOperations(0);
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testMkOp2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: testMkOp3, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: testRmOp1, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: testRmOp2, valid: true }
    ]);

    opsArray = await serializingOpsRepository2.getOperations(0);
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testMkOp2, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: testMkOp3, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: testRmOp1, valid: true },
        { opStr: "", valid: false, rejectionReason: RejectionReason.DESERIALIZATION_ERROR },
        { opStr: "", op: testRmOp2, valid: true }
    ]);
});

test('Failed-to-deserialize block does not affect next ones', async () => {
    const { serializingOpsRepository } = await getSerializingOpsRepository();

    const testMkOp1Broken = FsOperation.deserialize(testMkOp1.serialize());
    testMkOp1Broken.serialize = () => 'oh that serialization is broken!';
    await serializingOpsRepository.saveOperation(testMkOp1Broken);

    await serializingOpsRepository.saveOperation(testMkOp2);
    let opsArray = await serializingOpsRepository.getOperations();
    expect(opsArray.length).toBe(2);
    opsArray[1].opStr = "";
    expect(opsArray).toMatchObject([
        {
            opStr: "oh that serialization is broken!",
            valid: false,
            rejectionReason: RejectionReason.DESERIALIZATION_ERROR
        },
        { opStr: "", op: testMkOp2, valid: true },
    ]);

    testMkOp1Broken.serialize = () => "[this won't do neither¶•º§∞¢";
    await serializingOpsRepository.saveOperation(testMkOp1Broken);
    await serializingOpsRepository.saveOperation(testMkOp1Broken);
    await serializingOpsRepository.saveOperation(testMkOp1Broken);
    testMkOp1Broken.serialize = () => testRmOp2.serialize() + '!';
    await serializingOpsRepository.saveOperation(testMkOp1Broken);
    await serializingOpsRepository.saveOperation(testRmOp1);
    opsArray = await serializingOpsRepository.getOperations();
    expect(opsArray.length).toBe(5);
    opsArray[3].opStr = "";
    opsArray[4].opStr = "";
    expect(opsArray).toMatchObject([
        {
            opStr: "[this won't do neither¶•º§∞¢",
            valid: false,
            rejectionReason: RejectionReason.DESERIALIZATION_ERROR
        },
        {
            opStr: "[this won't do neither¶•º§∞¢",
            valid: false,
            rejectionReason: RejectionReason.DESERIALIZATION_ERROR
        },
        {
            opStr: "[this won't do neither¶•º§∞¢",
            valid: false,
            rejectionReason: RejectionReason.DESERIALIZATION_ERROR
        },
        {
            opStr: "",
            valid: false,
            rejectionReason: RejectionReason.DESERIALIZATION_ERROR
        },
        { opStr: "", op: testRmOp1, valid: true },
    ]);

    await serializingOpsRepository.saveOperation(testMkOp1);
    await serializingOpsRepository.saveOperation(testRmOp1);
    await serializingOpsRepository.saveOperation(testRmOp2);
    opsArray = await serializingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: testMkOp1, valid: true },
        { opStr: "", op: testRmOp1, valid: true },
        { opStr: "", op: testRmOp2, valid: true }
    ]);
});
