import { HashValidatingOpsRepository } from "../../hash-validating-ops-repository";
import { getSerializingOpsRepository, getParallelSerializingOpsRepositories } from "./serializing-ops-repository-test-impl";


export async function getHashValidatingOpsRepository() {
    const e1 = await getSerializingOpsRepository();
    const hashValidatingOpsRepository = new HashValidatingOpsRepository(e1.serializingOpsRepository);
    return Object.assign(e1, { hashValidatingOpsRepository });
}

export async function getParallelHashValidatingOpsRepositories() {
    const [e1, e2] = await getParallelSerializingOpsRepositories();
    const hashValidatingOpsRepository1 = new HashValidatingOpsRepository(e1.serializingOpsRepository);
    const hashValidatingOpsRepository2 = new HashValidatingOpsRepository(e2.serializingOpsRepository);
    return [
        Object.assign(e1, { hashValidatingOpsRepository: hashValidatingOpsRepository1 }),
        Object.assign(e2, { hashValidatingOpsRepository: hashValidatingOpsRepository2 })
    ];
}
