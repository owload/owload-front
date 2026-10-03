import { SerializingOpsRepository } from "../../serializing-ops-repository";
import { getSplittingOpsRepository, getParallelSplittingOpsRepositories } from "./splitting-ops-repository-test-impl";


export async function getSerializingOpsRepository() {
    const e1 = await getSplittingOpsRepository();
    const serializingOpsRepository = new SerializingOpsRepository(e1.splittingOpsRepository);
    return Object.assign(e1, { serializingOpsRepository });
}

export async function getParallelSerializingOpsRepositories() {
    const [e1, e2] = await getParallelSplittingOpsRepositories();
    const serializingOpsRepository1 = new SerializingOpsRepository(e1.splittingOpsRepository);
    const serializingOpsRepository2 = new SerializingOpsRepository(e2.splittingOpsRepository);
    return [
        Object.assign(e1, { serializingOpsRepository: serializingOpsRepository1 }),
        Object.assign(e2, { serializingOpsRepository: serializingOpsRepository2 })
    ];
}
