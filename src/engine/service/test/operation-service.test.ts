import { getTestUserId } from "@/engine/backend/test/mocks/test-user-info";
import { test, expect } from "vitest";
import { MkDirFsOperation, RmFsOperation } from "../fs-operation";
import { getOperationService, getParallelOperationServices } from "./implementations/operation-service-test-impl";


test('saveOperation returns successful result', async () => {
    const { operationService } = await getOperationService();
    const op1 = new MkDirFsOperation(getTestUserId(), '/movies');
    const saveOperationResult = await operationService.saveOperation(op1);
    saveOperationResult.newOperations.forEach(e => e.opStr = "");
    expect(saveOperationResult).toMatchObject({
        ok: true,
        newOperations: [
            { opStr: "", op: op1, valid: true }
        ],
    });
});

test('Consequently saveOperations then getOperations', async () => {
    const { operationService } = await getOperationService();
    const testUserId = getTestUserId();
    const op1 = new MkDirFsOperation(testUserId, '/movies');
    let saveOperationResult = await operationService.saveOperation(op1);
    saveOperationResult.newOperations.forEach(e => e.opStr = "");
    expect(saveOperationResult).toMatchObject({
        ok: true,
        newOperations: [
            { opStr: "", op: op1, valid: true }
        ],
    });
    const op2 = new RmFsOperation(testUserId, '/', ['movies']);
    saveOperationResult = await operationService.saveOperation(op2);
    saveOperationResult.newOperations.forEach(e => e.opStr = "");
    expect(saveOperationResult).toMatchObject({
        ok: true,
        newOperations: [
            { opStr: "", op: op2, valid: true }
        ],
    });
    let opsArray = await operationService.getOperations();
    expect(opsArray).toStrictEqual([]);
    opsArray = await operationService.getOperations(0, '');
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true }
    ]);
});

test('Save and get ops by multiple users with different ops services', async () => {
    const [e1, e2] = await getParallelOperationServices();
    const opsService1 = e1.operationService;
    const opsService2 = e2.operationService;
    const testUserId = getTestUserId();
    const op1 = new MkDirFsOperation(testUserId, '/dir1');
    const op2 = new RmFsOperation(testUserId, '/', ['dir1']);
    const op3 = new MkDirFsOperation(testUserId, '/', 'dir2');
    const op4 = new RmFsOperation(testUserId, '/', ['dir2']);
    let saveOperationResult = await opsService1.saveOperation(op1);
    expect(saveOperationResult.ok).toBe(true);
    let opsArray = saveOperationResult.newOperations.filter(e => e.valid).map(e => e.op);
    expect(opsArray).toStrictEqual([op1]);
    saveOperationResult = await opsService2.saveOperation(op2);
    expect(saveOperationResult.ok).toBe(true);
    opsArray = saveOperationResult.newOperations.filter(e => e.valid).map(e => e.op);
    expect(opsArray).toStrictEqual([op1, op2]);
    saveOperationResult = await opsService2.saveOperation(op4);
    expect(saveOperationResult.ok).toBe(true);
    opsArray = saveOperationResult.newOperations.filter(e => e.valid).map(e => e.op);
    expect(opsArray).toStrictEqual([op4]);
    saveOperationResult = await opsService1.saveOperation(op3);
    expect(saveOperationResult.ok).toBe(true);
    opsArray = saveOperationResult.newOperations.filter(e => e.valid).map(e => e.op);
    expect(opsArray).toStrictEqual([op2, op4, op3]);
    let opsWArray = await opsService1.getOperations(0, '');
    opsArray = opsWArray.filter(e => e.valid).map(e => e.op);
    expect(opsArray).toStrictEqual([op1, op2, op4, op3]);
    opsWArray = await opsService2.getOperations(0, '');
    opsArray = opsWArray.filter(e => e.valid).map(e => e.op);
    expect(opsArray).toStrictEqual([op1, op2, op4, op3]);
});

// TODO: this test fails
// test("Simultaneous save and get ops by one ops service do not duplicate or lose ops", async () => {
//     const N = 10;
//     const promises = [];
//     const opsService = await getOperationService(testUserId1);
//     for (let i = 0; i < N; i++) {
//         promises.push(
//             opsService.saveOperation(new MkDirFsOperation(testUserId1, "/" + i))
//         );
//     }
//     const results = await Promise.all(promises);
//     const retrievedOpsCount = results.reduce((s: number, e: SaveOperationResult)=>s+e.newOperations.length, 0);
//     expect(retrievedOpsCount).toBe(N);
// });

// TODO: complete tests
test('Save and get ops with different ops services', async () => {
    const [e1, e2] = await getParallelOperationServices();
    const opsService1 = e1.operationService;
    const opsService2 = e2.operationService;
    const testUserId = getTestUserId();
    const operations = [];
    let path = '';
    for (let i = 0; i < 20; i++) {
        path += '/' + i;
        const op1 = new MkDirFsOperation(testUserId, path);
        const op2 = new RmFsOperation(testUserId, '/', [path]);
        operations.push(op1);
        operations.push(op2);
        const [saveResult1, saveResult2] = await Promise.all([
            opsService1.saveOperation(op1),
            opsService2.saveOperation(op2),
        ]);
        expect(saveResult1.ok).toBe(true);
        expect(saveResult2.ok).toBe(true);
    }
    const opsWArray = await opsService2.getOperations(0, '');
    const opsArray = opsWArray.filter(e => e.valid);
    expect(opsArray.length).toBe(operations.length); //TODO: expected 4 received 2
});
