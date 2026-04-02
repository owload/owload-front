import { SplittingOpsRepository } from "../../splitting-ops-repository";
import { getEncryptingOpsRepository, getParallelEncryptingOpsRepositories } from "./encrypting-ops-repository-test-impl";


export async function getSplittingOpsRepository() {
    const e1 = await getEncryptingOpsRepository();
    const splittingOpsRepository = new SplittingOpsRepository(e1.encryptingOpsRepository);
    await splittingOpsRepository.getOperations();
    return Object.assign(e1, { splittingOpsRepository });
}

export async function getParallelSplittingOpsRepositories() {
    const [e1, e2] = await getParallelEncryptingOpsRepositories();
    const splittingOpsRepository1 = new SplittingOpsRepository(e1.encryptingOpsRepository);
    const splittingOpsRepository2 = new SplittingOpsRepository(e2.encryptingOpsRepository);
    await splittingOpsRepository1.getOperations();
    await splittingOpsRepository2.getOperations();
    return [
        Object.assign(e1, { splittingOpsRepository: splittingOpsRepository1 }),
        Object.assign(e2, { splittingOpsRepository: splittingOpsRepository2 })
    ]
}
