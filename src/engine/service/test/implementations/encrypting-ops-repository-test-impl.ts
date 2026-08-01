import { getFilesystemBackend } from "@/engine/backend/test/implementations/filesystem-backend-test-impl";
import { AesEncryptor, deriveStreamKey, generateKey } from "@/engine/core/enc";
import { base64ToUint8Array } from "@/engine/core/stream-utils";
import { EncryptingOpsRepository } from "../../encrypting-ops-repository";

const EncryptorImpl = AesEncryptor;
const defaultPassword = 'Some secret key';

export async function getEncryptingOpsRepository() {
    const { filesystemBackend, driveInfo } = await getFilesystemBackend();
    const counterNonce = base64ToUint8Array(driveInfo.counterNonce);
    const keyEncoded = await generateKey(defaultPassword, base64ToUint8Array(driveInfo.keyNonce));
    const K_ops = await deriveStreamKey(keyEncoded, counterNonce, 'owload-ops-v2');
    const encryptor = new EncryptorImpl<Uint8Array>(K_ops, counterNonce);
    const encryptingOpsRepository = new EncryptingOpsRepository(driveInfo.id, filesystemBackend, encryptor);
    await encryptingOpsRepository.getOperations();
    return {
        filesystemBackend,
        driveInfo,
        keyEncoded,
        encryptingOpsRepository
    };
}

export async function getParallelEncryptingOpsRepositories() {
    const { filesystemBackend, driveInfo } = await getFilesystemBackend();
    const keyNonce = base64ToUint8Array(driveInfo.keyNonce);
    const counterNonce = base64ToUint8Array(driveInfo.counterNonce);
    const keyEncoded = await generateKey(defaultPassword, keyNonce);
    const K_ops1 = await deriveStreamKey(keyEncoded, counterNonce, 'owload-ops-v2');
    const K_ops2 = await deriveStreamKey(keyEncoded, counterNonce, 'owload-ops-v2');
    const encryptor1 = new EncryptorImpl<Uint8Array>(K_ops1, counterNonce);
    const encryptor2 = new EncryptorImpl<Uint8Array>(K_ops2, counterNonce);
    const encryptingOpsRepository1 = new EncryptingOpsRepository(driveInfo.id, filesystemBackend, encryptor1);
    const encryptingOpsRepository2 = new EncryptingOpsRepository(driveInfo.id, filesystemBackend, encryptor2);
    await encryptingOpsRepository1.getOperations();
    await encryptingOpsRepository2.getOperations();
    return [
        {
            filesystemBackend,
            driveInfo,
            keyEncoded,
            encryptingOpsRepository: encryptingOpsRepository1
        },
        {
            filesystemBackend,
            driveInfo,
            keyEncoded,
            encryptingOpsRepository: encryptingOpsRepository2
        }
    ];
}
