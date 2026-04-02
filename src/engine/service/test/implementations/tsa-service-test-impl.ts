import PkiBackendTestImpl from "@/engine/backend/test/implementations/pki-backend-test-impl";
import { getTsaBackend } from "@/engine/backend/test/implementations/tsa-backend-test-impl";
import { PkiService } from "../../pki-service";
import { TsaService } from "../../tsa-service";

export async function getTsaService(): Promise<TsaService> {
    const pkiBackend = new PkiBackendTestImpl();
    const tsaBackend = await getTsaBackend()
    const pkiService = new PkiService(pkiBackend);
    return new TsaService(tsaBackend, pkiService);
}
