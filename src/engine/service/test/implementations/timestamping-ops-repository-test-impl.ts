import { TimestampingOpsRepository } from "../../timestamping-ops-repository";
import { getSigningOpsRepository, getParallelSigningOpsRepositories } from "./signing-ops-repository-test-impl";
import { getTsaService } from "./tsa-service-test-impl";


export async function getTimestampingOpsRepository() {
    const tsaService = await getTsaService();
    const e1 = await getSigningOpsRepository();
    const timestampingOpsRepository = new TimestampingOpsRepository(e1.signingOpsRepository, tsaService);
    return Object.assign(e1, { timestampingOpsRepository });
}

export async function getParallelTimestampingOpsRepositories() {
    const tsaService = await getTsaService();
    const [e1, e2] = await getParallelSigningOpsRepositories();
    const timestampingOpsRepository1 = new TimestampingOpsRepository(e1.signingOpsRepository, tsaService);
    const timestampingOpsRepository2 = new TimestampingOpsRepository(e2.signingOpsRepository, tsaService);
    return [
        Object.assign(e1, { timestampingOpsRepository: timestampingOpsRepository1 }),
        Object.assign(e2, { timestampingOpsRepository: timestampingOpsRepository2 })
    ];
}
