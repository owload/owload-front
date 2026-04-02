import { RestUserBackend } from "../../user-backend";
import { MockUserBackend } from "../mocks/user-backend.mock";


let UserBackendTestImpl: typeof RestUserBackend | typeof MockUserBackend;
switch (import.meta.env.TEST_API_MODE) {
    case "REST":
        UserBackendTestImpl = RestUserBackend;
        break;
    case "MOCK":
    default:
        UserBackendTestImpl = MockUserBackend;
}

export default UserBackendTestImpl;