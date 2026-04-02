import { OperationService } from "../../operation-service";
import { getTimestampingOpsRepository, getParallelTimestampingOpsRepositories } from "./timestamping-ops-repository-test-impl";


export async function getOperationService() {
    const e1 = await getTimestampingOpsRepository();
    const operationService = new OperationService(e1.timestampingOpsRepository);
    return Object.assign(e1, { operationService });
}

export async function getParallelOperationServices() {
    const [e1, e2] = await getParallelTimestampingOpsRepositories();
    const opsService1 = new OperationService(e1.timestampingOpsRepository);
    const opsService2 = new OperationService(e2.timestampingOpsRepository);
    return [
        Object.assign(e1, { operationService: opsService1 }),
        Object.assign(e2, { operationService: opsService2 })
    ];
}
