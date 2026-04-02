import { TsaBackend, RestTsaBackend } from "../../tsa-backend";
import { MockTsaBackend } from "../mocks/tsa-backend.mock";


export async function getTsaBackend(): Promise<TsaBackend> {
    let tsaBackend: TsaBackend;
    switch (import.meta.env.TEST_API_MODE) {
        case "REST":
            tsaBackend = new RestTsaBackend();
            break;
        case "MOCK":
        default:
            const mockTsaBackend = new MockTsaBackend();
            await mockTsaBackend.init();
            tsaBackend = mockTsaBackend;
    }
    return tsaBackend;
}
