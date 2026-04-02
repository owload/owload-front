import { getTestUserId } from "@/engine/backend/test/mocks/test-user-info";
import { generateRsaKeys, importPrivateKey } from "@/engine/core/enc-sig";
import { test, expect } from "vitest";
import { MkDirFsOperation } from "../fs-operation";
import { RejectionReason } from "../ops-repository";
import { getSigningOpsRepository, getParallelSigningOpsRepositories } from "./implementations/signing-ops-repository-test-impl";

test("Empty drive returns empty result", async () => {
    const { signingOpsRepository } = await getSigningOpsRepository();
    const opsArray = await signingOpsRepository.getOperations();
    expect(opsArray).toStrictEqual([]);
});

test("Save operation then get operation, signature is filled in", async () => {
    const { signingOpsRepository } = await getSigningOpsRepository();
    const op = new MkDirFsOperation("", "/");
    await signingOpsRepository.saveOperation(op);
    const opsArray = await signingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([{ opStr: "", op, valid: true }]);
    expect(op.createdBySig).toBeTypeOf("string");
    expect(op.createdBySig).not.toBeNull();
    expect(op.createdBySig!.length).toBeGreaterThan(0);
    expect(op.createdBy).equals(getTestUserId());
});

test("Save and get multiple operations", async () => {
    const { signingOpsRepository } = await getSigningOpsRepository();
    const op1 = new MkDirFsOperation("", "/");
    const op2 = new MkDirFsOperation("", "/");
    await signingOpsRepository.saveOperation(op1);
    await signingOpsRepository.saveOperation(op2);
    const opsArray = await signingOpsRepository.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true }
    ]);
    expect(op1.createdBySig).toBeTypeOf("string");
    expect(op1.createdBySig).not.toBeNull();
    expect(op1.createdBySig!.length).toBeGreaterThan(0);
    expect(op1.createdBy).equals(getTestUserId());
    expect(op2.createdBySig).toBeTypeOf("string");
    expect(op2.createdBySig).not.toBeNull();
    expect(op2.createdBySig!.length).toBeGreaterThan(0);
    expect(op2.createdBy).equals(getTestUserId());
});

test("Save and get multiple operations by multiple users", async () => {
    const [e1, e2] = await getParallelSigningOpsRepositories();
    const signingOpsRepository1 = e1.signingOpsRepository;
    const signingOpsRepository2 = e2.signingOpsRepository;
    const op1 = new MkDirFsOperation("", "/");
    const op2 = new MkDirFsOperation("", "/1");
    await signingOpsRepository1.saveOperation(op1);
    await signingOpsRepository2.getOperations();
    await signingOpsRepository2.saveOperation(op2);
    let opsArray = await signingOpsRepository1.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true }
    ]);
    opsArray = await signingOpsRepository2.getOperations();
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op2, valid: true }
    ]);
    opsArray = await signingOpsRepository2.getOperations(0, "");
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: true }
    ]);
});

test("Save and get multiple operations with rejections", async () => {
    const { signingOpsRepository } = await getSigningOpsRepository();
    const rsaKeys = await generateRsaKeys();
    const wrongPrivateKey = await importPrivateKey(rsaKeys.privateKeyBase64);
    const correctPrivateKey = Reflect.get(signingOpsRepository, "userPrivateKey");

    const op1 = new MkDirFsOperation("", "/");
    const op2 = new MkDirFsOperation("", "/1");
    const op3 = new MkDirFsOperation("", "/2");
    const op4 = new MkDirFsOperation("", "/3");

    await signingOpsRepository.getOperations();
    await signingOpsRepository.saveOperation(op1);

    Reflect.set(signingOpsRepository, "userPrivateKey", wrongPrivateKey);
    await signingOpsRepository.getOperations();
    await signingOpsRepository.saveOperation(op2);

    await signingOpsRepository.getOperations();
    await signingOpsRepository.saveOperation(op3);

    Reflect.set(signingOpsRepository, "userPrivateKey", correctPrivateKey);
    await signingOpsRepository.getOperations();
    await signingOpsRepository.saveOperation(op4);

    let opsArray = await signingOpsRepository.getOperations(0, "");
    opsArray.forEach(e => e.opStr = "");
    expect(opsArray).toMatchObject([
        { opStr: "", op: op1, valid: true },
        { opStr: "", op: op2, valid: false, rejectionReason: RejectionReason.INVALID_USER_SIGNATURE },
        { opStr: "", op: op3, valid: false, rejectionReason: RejectionReason.INVALID_USER_SIGNATURE },
        { opStr: "", op: op4, valid: true },
    ]);
});

