import { OperationService } from "../../operation-service";
import { getHashValidatingOpsRepository, getParallelHashValidatingOpsRepositories } from "./hash-validating-ops-repository-test-impl";


export async function getOperationService() {
    const e1 = await getHashValidatingOpsRepository();
    const operationService = new OperationService(e1.hashValidatingOpsRepository);
    return Object.assign(e1, { operationService });
}

export async function getParallelOperationServices() {
    const [e1, e2] = await getParallelHashValidatingOpsRepositories();
    const opsService1 = new OperationService(e1.hashValidatingOpsRepository);
    const opsService2 = new OperationService(e2.hashValidatingOpsRepository);
    return [
        Object.assign(e1, { operationService: opsService1 }),
        Object.assign(e2, { operationService: opsService2 })
    ];
}
