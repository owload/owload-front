import { expect, test } from 'vitest';
import UserBackendTestImpl from './implementations/user-backend-test-impl';
import { getTestUserId, getTestUserEmail } from './mocks/test-user-info';



test('Method findUsers. Tests require Alice and Bob users to be registered', async () => {
    const userBackend = new UserBackendTestImpl();
    let users = await userBackend.findUsers("alice@example.com");
    expect(users.length).toBe(1);
    expect(users[0].email).toBe("alice@example.com");
    users = await userBackend.findUsers("bob@example.com");
    expect(users.length).toBe(1);
    expect(users[0].email).toBe("bob@example.com");
});

test('saveUserBasicInfo then getUserBasicInfo', async () => {
    const userBackend = new UserBackendTestImpl();
    const someName = "someName";
    const userId = getTestUserId();
    const email = getTestUserEmail();
    await userBackend.saveUserBasicInfo({
        name: someName
    });
    let users = await userBackend.findUsers(email);
    expect(users.length).toBe(1);
    expect(users[0].userId).toBe(userId);
    expect(users[0].email).toBe(email);
    expect(users[0].name).toBe(someName);
});
