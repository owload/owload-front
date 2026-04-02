import { RestDriveBackend } from "../../drive-backend";
import { MockDriveBackend } from "../mocks/drive-backend.mock";


let DriveBackendTestImpl: typeof RestDriveBackend | typeof MockDriveBackend;
switch (import.meta.env.TEST_API_MODE) {
    case "REST":
        DriveBackendTestImpl = RestDriveBackend;
        break;
    case "MOCK":
    default:
        DriveBackendTestImpl = MockDriveBackend;
}

export default DriveBackendTestImpl;