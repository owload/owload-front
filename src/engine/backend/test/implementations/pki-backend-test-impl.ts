import { RestPkiBackend } from "../../pki-backend";
import { MockPkiBackend } from "../mocks/pki-backend.mock";


let PkiBackendTestImpl: typeof RestPkiBackend | typeof MockPkiBackend;
switch (import.meta.env.TEST_API_MODE) {
    case "REST":
        PkiBackendTestImpl = RestPkiBackend;
        break;
    case "MOCK":
    default:
        PkiBackendTestImpl = MockPkiBackend;
}

export default PkiBackendTestImpl;