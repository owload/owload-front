import PkiBackendTestImpl from "@/engine/backend/test/implementations/pki-backend-test-impl";
import { getTestUserId } from "@/engine/backend/test/mocks/test-user-info";
import { importPrivateKey } from "@/engine/core/enc-sig";
import { PkiService } from "../../pki-service";
import { SigningOpsRepository } from "../../signing-ops-repository";
import { getHashValidatingOpsRepository, getParallelHashValidatingOpsRepositories } from "./hash-validating-ops-repository-test-impl";


export async function getSigningOpsRepository() {
    const pkiBackend = new PkiBackendTestImpl();
    const pkiService = new PkiService(pkiBackend);
    const userRsaKeys = await pkiService.getUserRsaKeys();
    const privateKey = await importPrivateKey(userRsaKeys[0].privateKeyBase64);
    const e1 = await getHashValidatingOpsRepository();
    const signingOpsRepository = new SigningOpsRepository(e1.hashValidatingOpsRepository, getTestUserId(), privateKey, pkiService);;
    return Object.assign(e1, { signingOpsRepository });
}

export async function getParallelSigningOpsRepositories() {
    const pkiBackend = new PkiBackendTestImpl();
    const pkiService = new PkiService(pkiBackend);
    const userRsaKeys = await pkiService.getUserRsaKeys();
    const privateKey = await importPrivateKey(userRsaKeys[0].privateKeyBase64);

    const [e1, e2] = await getParallelHashValidatingOpsRepositories();
    const signingOpsRepository1 = new SigningOpsRepository(e1.hashValidatingOpsRepository, getTestUserId(), privateKey, pkiService);;
    const signingOpsRepository2 = new SigningOpsRepository(e2.hashValidatingOpsRepository, getTestUserId(), privateKey, pkiService);;
    return [
        Object.assign(e1, { signingOpsRepository: signingOpsRepository1 }),
        Object.assign(e2, { signingOpsRepository: signingOpsRepository2 })
    ];
}
