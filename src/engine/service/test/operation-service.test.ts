import { test, expect } from "vitest";
import { MkDirFsOperation, RmFsOperation } from "../fs-operation";
import { getOperationService, getParallelOperationServices } from "./implementations/operation-service-test-impl";


test('saveOperation returns successful result', async () => {
    const { operationService } = await getOperationService();
    const op1 = new MkDirFsOperation('/movies');
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
    const op1 = new MkDirFsOperation('/movies');
    let saveOperationResult = await operationService.saveOperation(op1);
    saveOperationResult.newOperations.forEach(e => e.opStr = "");
    expect(saveOperationResult).toMatchObject({
        ok: true,
        newOperations: [
            { opStr: "", op: op1, valid: true }
        ],
    });
    const op2 = new RmFsOperation('/', ['movies']);
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
    const op1 = new MkDirFsOperation('/dir1');
    const op2 = new RmFsOperation('/', ['dir1']);
    const op3 = new MkDirFsOperation('/', 'dir2');
    const op4 = new RmFsOperation('/', ['dir2']);
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

test('Save and get ops with different ops services', async () => {
    const [e1, e2] = await getParallelOperationServices();
    const opsService1 = e1.operationService;
    const opsService2 = e2.operationService;
    const operations = [];
    let path = '';
    for (let i = 0; i < 20; i++) {
        path += '/' + i;
        const op1 = new MkDirFsOperation(path);
        const op2 = new RmFsOperation('/', [path]);
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
