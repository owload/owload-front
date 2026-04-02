import { PkiBackend } from "../../pki-backend";
import { UserId } from "../../user-backend";
import { getTestUserId } from "./test-user-info";

export class MockPkiBackend implements PkiBackend {
    private readonly userRsaKeys: { userId: UserId; publicKeyBase64: string; privateKeyBase64: string }[] = [];
    private readonly tsaPublicKeys: { tsaId: string; publicKeyBase64: string }[] = [
        {
            tsaId: "599cadae-e884-44da-a05f-5798696ecf7d",
            publicKeyBase64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAz8gOOIV3gf2EwqZ/OA6Ilh9Iq41URDZ5Bpb67Nt/klsqRz2gbubNyn4jphNwnlYjf6A+82tke7Bl15zzT1xr18U5/y+RWlQezw1xaR4Zj/IBazt6loyxv70ntiE45pHrE+dA+CAtFvmLTVK2p1QNznc1kCYYgNowJVnolGQ0Hgw9/bhOpZmhwlVE+Fn9yg0K7NpFSlhnurSONRFkQl81TJ1r7UrIoBjKM2R9Lwl1s3K4QF1F+hd4Vy8kk0phGBrvo+khpDh6Cmxbjjl54Z6DbfFuUEdWBtEBmLGCI1GtcS5Z/joX4BDzh/khnD3bv8kJtZ7A26dY1OQdifc1/l9PHQIDAQAB"
        }
    ];

    constructor() {
        this.userRsaKeys.push({
            userId: getTestUserId(),
            publicKeyBase64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwQdYu0lqkWatBDriZpOT3AgQqkoPL39h0x98keSyrQ0dALef4NUkj522okz2an5ipETKDgTuXyNt5fzpe1vHI4tfC1Ky/AWQRLij9FTWvsSP6WfpgauiXW8B4apxF+xkGGSq8R6zIo26RRsZd8MCAo7k+l2PouEgKYNBh03cu0qe1sR5nVkJpGIkbUaDRu54OL4cqgHruXid1P+WpOF05yE+zRSBjo3UO8Znx7Dvao5KCCzxEWOCAETzgT9kGNQlfLrjYiWYpSIhTXM/AQE5a/LoDu145pXEfprkYjAQYVSAYTvIjA+oDx7VHadjpiKSfXCH9F/M8pAo4DThTBtnRwIDAQAB",
            privateKeyBase64: "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDBB1i7SWqRZq0EOuJmk5PcCBCqSg8vf2HTH3yR5LKtDR0At5/g1SSPnbaiTPZqfmKkRMoOBO5fI23l/Ol7W8cji18LUrL8BZBEuKP0VNa+xI/pZ+mBq6JdbwHhqnEX7GQYZKrxHrMijbpFGxl3wwICjuT6XY+i4SApg0GHTdy7Sp7WxHmdWQmkYiRtRoNG7ng4vhyqAeu5eJ3U/5ak4XTnIT7NFIGOjdQ7xmfHsO9qjkoILPERY4IARPOBP2QY1CV8uuNiJZilIiFNcz8BATlr8ugO7XjmlcR+muRiMBBhVIBhO8iMD6gPHtUdp2OmIpJ9cIf0X8zykCjgNOFMG2dHAgMBAAECggEADdSwwxaobUut7lApJGVtokXs/8P3tj+1Kt37hy6brjJILOLQsK5FBN9YPzqEK4RBHXkVAI/SOVHous0g46cOAUTSu2p3tal7uVjWMphuR1P+kHWoHGjyZNR344tauCFG2MfvHFYb9XKx8T1XA/xJOsAHYHhvZXcmXqMaK7o6AddfynIP+gsJS/78YQGD9NuMuIpijtQFuAImKg6yMcpJMigEAl9NtoyHS8o3d5eKa3wZLEp/uTicuOBlwD32FxAeaUve2zo3vjrzYVhpdVSxdWotOi8Buz3SDivs/6n5vgLnaXnhd5T3bNpy+733o9Ef/EjV91635IjnPIfPlqnh0QKBgQDyDvWTOjwSKr0pq2AAhfOoV1ZKePRQGgjlk2tW3RuJfBAMfhubSaodELPDbRmbBAm/rs4KminrhHQMc3TfaO491wqk6fwPt4J/+8bklAuXhipJcT0M8q38ohQqylP6VULUbDuz3QbYNEOWyuLjZAFpUEIls7Sw7ISFKbxKjWU+dwKBgQDMJXdgyfd8flOX5HE9KVU5JZKTIbrLfuEPHefdFEK+qdTPgOtkl3f9jL0AOXaARpRHKeVM9CPdumdHdWNRnOyOqbK+Ur3k0YcnxIOq3EYVNkwKtiLWjh7Te6IqKio9kn+gXFRNe5e8RB3FftQgW4dhfOAxjuhV0xDJHVmbonlBsQKBgFhGFFCowBdv9qQnl08Zio4tq45lJdPAatYuOMrov44X7FJh+vdamesXmDcApoHdqyB4QzOinP8Cwr93q3t97MQok/0oR4AD0FeUHihlxQRxLSKzZSw/pCupf+lK9+0nAsQs5GjnhgN6q9tmCfAbHFinqDfPnWmYF4voeH5HqlBpAoGAQSpUiRjvX1YT6RCK9TMUeUF9IGpL7ll6DhFFylSFWcdsnzBP87RGITGjw0aUhS4CdxTwlTf5mvW9shnOsmadPIz++bH/2+LmedNJFGlsFalXbLPnOwXy4R8+DKeZBD6XbuEKKBGjxf0YY8qwfAO7m2r5RdiQYZUWbpxn1j5u5oECgYBRrpqFCHesN/gvD3JN7cLpFoxpyjR7APC3OriTFarFQ1Y4iZaJOeiFPALMpwJ21sKCZ7JmGPNKNNhIGc4fT45XySMz+AM54Da2fqTBQZELQuJ09YJIMX4864ik0wdNexO4ahavoVt2ZPc3PITfRFd4DgS5EdskhsHVtx+8TZcgKw=="
        });
        // assume alice@example.com and bob@example.com are registered users with ids "1" and "2"
        // some mock but valid RSA keys
        this.userRsaKeys.push({
            userId: "1",
            publicKeyBase64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwQdYu0lqkWatBDriZpOT3AgQqkoPL39h0x98keSyrQ0dALef4NUkj522okz2an5ipETKDgTuXyNt5fzpe1vHI4tfC1Ky/AWQRLij9FTWvsSP6WfpgauiXW8B4apxF+xkGGSq8R6zIo26RRsZd8MCAo7k+l2PouEgKYNBh03cu0qe1sR5nVkJpGIkbUaDRu54OL4cqgHruXid1P+WpOF05yE+zRSBjo3UO8Znx7Dvao5KCCzxEWOCAETzgT9kGNQlfLrjYiWYpSIhTXM/AQE5a/LoDu145pXEfprkYjAQYVSAYTvIjA+oDx7VHadjpiKSfXCH9F/M8pAo4DThTBtnRwIDAQAB",
            privateKeyBase64: "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDBB1i7SWqRZq0EOuJmk5PcCBCqSg8vf2HTH3yR5LKtDR0At5/g1SSPnbaiTPZqfmKkRMoOBO5fI23l/Ol7W8cji18LUrL8BZBEuKP0VNa+xI/pZ+mBq6JdbwHhqnEX7GQYZKrxHrMijbpFGxl3wwICjuT6XY+i4SApg0GHTdy7Sp7WxHmdWQmkYiRtRoNG7ng4vhyqAeu5eJ3U/5ak4XTnIT7NFIGOjdQ7xmfHsO9qjkoILPERY4IARPOBP2QY1CV8uuNiJZilIiFNcz8BATlr8ugO7XjmlcR+muRiMBBhVIBhO8iMD6gPHtUdp2OmIpJ9cIf0X8zykCjgNOFMG2dHAgMBAAECggEADdSwwxaobUut7lApJGVtokXs/8P3tj+1Kt37hy6brjJILOLQsK5FBN9YPzqEK4RBHXkVAI/SOVHous0g46cOAUTSu2p3tal7uVjWMphuR1P+kHWoHGjyZNR344tauCFG2MfvHFYb9XKx8T1XA/xJOsAHYHhvZXcmXqMaK7o6AddfynIP+gsJS/78YQGD9NuMuIpijtQFuAImKg6yMcpJMigEAl9NtoyHS8o3d5eKa3wZLEp/uTicuOBlwD32FxAeaUve2zo3vjrzYVhpdVSxdWotOi8Buz3SDivs/6n5vgLnaXnhd5T3bNpy+733o9Ef/EjV91635IjnPIfPlqnh0QKBgQDyDvWTOjwSKr0pq2AAhfOoV1ZKePRQGgjlk2tW3RuJfBAMfhubSaodELPDbRmbBAm/rs4KminrhHQMc3TfaO491wqk6fwPt4J/+8bklAuXhipJcT0M8q38ohQqylP6VULUbDuz3QbYNEOWyuLjZAFpUEIls7Sw7ISFKbxKjWU+dwKBgQDMJXdgyfd8flOX5HE9KVU5JZKTIbrLfuEPHefdFEK+qdTPgOtkl3f9jL0AOXaARpRHKeVM9CPdumdHdWNRnOyOqbK+Ur3k0YcnxIOq3EYVNkwKtiLWjh7Te6IqKio9kn+gXFRNe5e8RB3FftQgW4dhfOAxjuhV0xDJHVmbonlBsQKBgFhGFFCowBdv9qQnl08Zio4tq45lJdPAatYuOMrov44X7FJh+vdamesXmDcApoHdqyB4QzOinP8Cwr93q3t97MQok/0oR4AD0FeUHihlxQRxLSKzZSw/pCupf+lK9+0nAsQs5GjnhgN6q9tmCfAbHFinqDfPnWmYF4voeH5HqlBpAoGAQSpUiRjvX1YT6RCK9TMUeUF9IGpL7ll6DhFFylSFWcdsnzBP87RGITGjw0aUhS4CdxTwlTf5mvW9shnOsmadPIz++bH/2+LmedNJFGlsFalXbLPnOwXy4R8+DKeZBD6XbuEKKBGjxf0YY8qwfAO7m2r5RdiQYZUWbpxn1j5u5oECgYBRrpqFCHesN/gvD3JN7cLpFoxpyjR7APC3OriTFarFQ1Y4iZaJOeiFPALMpwJ21sKCZ7JmGPNKNNhIGc4fT45XySMz+AM54Da2fqTBQZELQuJ09YJIMX4864ik0wdNexO4ahavoVt2ZPc3PITfRFd4DgS5EdskhsHVtx+8TZcgKw=="
        });
        this.userRsaKeys.push({
            userId: "2",
            publicKeyBase64: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAmN+3CSn73uogcx1Qpg1I9ue1cU5EJAgAs4T1gyRubiCYM1kjKm5hKehyXwVkocyjQwi8PfnFpIfVhpY/cuH0uUfDEXC5luMRNw1JlPrd/S2JYWdmpm9TbVDYPgk0FEYGrQxF0ggTSXfwd2wV3RH/4eTXhSVY8WCpo43Pb+Fovpg46WRm6Vsg5S146oImK5NcesLQMa43D7CegME28Rx2uUZuDcyeOKJx4821hWsUw9Psv1NYAZevlNoe+H4cJa//ltcCCKDOg/17t9ds0HLrg9HNbCl0+CNfeuvVFv/zSGOCV44pmwekBUHyr4LFLBWv7vkVX6ZOPReNdPhNRfFElQIDAQAB",
            privateKeyBase64: "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCY37cJKfve6iBzHVCmDUj257VxTkQkCACzhPWDJG5uIJgzWSMqbmEp6HJfBWShzKNDCLw9+cWkh9WGlj9y4fS5R8MRcLmW4xE3DUmU+t39LYlhZ2amb1NtUNg+CTQURgatDEXSCBNJd/B3bBXdEf/h5NeFJVjxYKmjjc9v4Wi+mDjpZGbpWyDlLXjqgiYrk1x6wtAxrjcPsJ6AwTbxHHa5Rm4NzJ44onHjzbWFaxTD0+y/U1gBl6+U2h74fhwlr/+W1wIIoM6D/Xu312zQcuuD0c1sKXT4I19669UW//NIY4JXjimbB6QFQfKvgsUsFa/u+RVfpk49F410+E1F8USVAgMBAAECggEAJ98peQ1nMOO1pPB/aV/LqQIUE8JLCW7A6BGEizjESJrdt37HKjjxxKFouxnH/l9GMaSknDF5+Aipi1nCoK8ISg7KdNEGxrDge5BOobmwjmkDDNGQN1aP1tIgJEX4PFVrRlUOHNKYXTAYGr2pEiiwqXUrNQHhqcsBU7QX52FOFW9tJBB5vD3O9BDf0nbJ2CJHZC+Gr/GFbk8M/ZRHvvHS/E8ekzW603OqzgMe+PwlJVIFF7H+KapJtSbDpJ9LAeyM0MHfF3hj30KIupVUk5a8T1mA6WzUPtwFtG8ca+2XNLZYVkmd4ZuCvXeyC5fXRJZIdmgh+iHUYtwIJtniCDbbHQKBgQDLj1l6qyff9U93xhbRtc+aWbMtzapmjtyLph9S0rvb4piGEhP7n4upDjIw615mSqqv7vWrcD6g6g3m0RseiTEfB2jbsYNRvuC/wetEkFcXuSfnVK6M3s/t52L3kUMKWzTVoLc7rGg92MjNIml7NQkc9p9Y6FdvbNWpetfokneTTwKBgQDAQaarpuFqwRyni6F/KQlF7w3xoFqKP8qiO70N5pwfwapIlE0dkg61R4XYvYcs8jeBHOGuusRn8+w+NrWBABVmGserPXewJVzV4kWcn0CRMCozsCS4NR56F2EDk/7pOLPZM3paz44BeCzFlwPjl3GArEn5ibAIXTLag28kw2XA2wKBgDSES0WGmscA9vujs4dvLJxZwAx1Hx1Ohj/RIAuyKp1UHJ2aVGV6iAGZlAFi9/vUD61MLT2Ju96wA94k3KZIJtAmjTsA1Sxl3n4afaQ2yQFp142rH01gvqxWIgZVB8LIPR1QVXWjyVELeOLTmfsbd7ptNjct2kD5BzauZr2t7AOpAoGAMCzDPOP2PC/jpEAi2aBIyJNcZR2PUnElr31UpDUTDgoTR1iR8kT1FouziFoFk0emjN3V11jJelru6a//zzFcK1eujMQ8R5E1MAsg8lwda8Qr7wPGT7pPxrww/RqKl5ozxstVb4fux4N7hI+Q0+jQ8jM53iOYTqA76/FfWlD0IF0CgYAMq2bliMztE0/GioMMbYXzH6smVreO50OHdV0Qnk3HdCuYgjxHLpagEh2PkV6LfkfLYdF0t1kKbtD5leSk7hWCmd33tds/PhB4hFKrSqhokccoTSmYKP7Y0gHOwGIkwyvbvDy63tB+Yo4xaGOdA+196u39hy8uzJkA3PjpZ+5K7w=="
        });
    }

    async getUsersPublicKeys(userIds: UserId[]): Promise<{ userId: UserId; publicKeyBase64: string }[]> {
        const filteredKeys = this.userRsaKeys.filter((e) => userIds.includes(e.userId));
        return filteredKeys.map(e => { return { userId: e.userId, publicKeyBase64: e.publicKeyBase64 } });
    }

    async getTsaPublicKeys(tsaIds: string[]): Promise<{ tsaId: string; publicKeyBase64: string }[]> {
        return this.tsaPublicKeys.filter((e) => tsaIds.includes(e.tsaId));
    }

    async getUserRsaKeys(): Promise<{ userId: UserId; publicKeyBase64: string; privateKeyBase64: string }[]> {
        const userId = getTestUserId();
        const keysObj = this.userRsaKeys.find(e => e.userId === userId);
        return keysObj ? [keysObj] : [];
    }

    async registerUserRsaKeys(publicKeyBase64: string, privateKeyBase64: string): Promise<void> {
        const userId = getTestUserId();
        let keysObj = this.userRsaKeys.find(e => e.userId === userId);
        if (keysObj) {
            keysObj.privateKeyBase64 = privateKeyBase64;
            keysObj.publicKeyBase64 = publicKeyBase64;
        } else {
            this.userRsaKeys.push({
                userId,
                publicKeyBase64,
                privateKeyBase64
            });
        }
    }

}