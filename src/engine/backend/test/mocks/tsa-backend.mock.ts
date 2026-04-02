import { importPrivateKey, sign } from "@/engine/core/enc-sig";
import { TsaBackend } from "../../tsa-backend";

export class MockTsaBackend implements TsaBackend {
    private readonly tsaId = "599cadae-e884-44da-a05f-5798696ecf7d";
    private readonly privateKeyBase64 = "MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDPyA44hXeB/YTCpn84DoiWH0irjVRENnkGlvrs23+SWypHPaBu5s3KfiOmE3CeViN/oD7za2R7sGXXnPNPXGvXxTn/L5FaVB7PDXFpHhmP8gFrO3qWjLG/vSe2ITjmkesT50D4IC0W+YtNUranVA3OdzWQJhiA2jAlWeiUZDQeDD39uE6lmaHCVUT4Wf3KDQrs2kVKWGe6tI41EWRCXzVMnWvtSsigGMozZH0vCXWzcrhAXUX6F3hXLySTSmEYGu+j6SGkOHoKbFuOOXnhnoNt8W5QR1YG0QGYsYIjUa1xLln+OhfgEPOH+SGcPdu/yQm1nsDbp1jU5B2J9zX+X08dAgMBAAECggEACT9Qn8zN8M2lG1G6BY56NnFKWk9+Ga9xfl5QXVJDKWdAMVrCPdvbbv9L+/TscLym3OP3aUMST5keLzfZt+4dbpbCUsDDkpTbHRJ6RamQMDmqgt0OFGAccFatVt1i7Lo/mwLMf5uaoE5or0UFTjgNoOMYOnJ9acdjaYYlwTIHYTkSEqpWc7kxqdYCfn451CAZVAEnuWeY9KKHlafVQaJMW0Vtt5GV2nwenu0JQx3qogZPI3LAvXUrggkPxSoRuWs1gn8r0ssZbKS6Wh9NgttveoMyR7tcSIC76DZ+U1WabCkGN9L6uLoozVAKSebpy5xCkbgmsQHTRSzegdves+Q2kQKBgQDw2LFniFE17fr6maRpbWZKW0v5UqoXijBx8yVFOgCiFJH/7urCNNTh49kTOYIXTxcXwSmNeDmoCPV2HQ50wFxmihMlKRezliPwXiayPprXIjoMPWB9jMw8wYH8nuUDeAFDS7ruggqJPGefdouiSUlJgHWtTS3roSRASBbfq2O3JwKBgQDc2skkf/eNK90eN7VT8KtQ+vsG9p+VjhNlGyGk++W5os6pkXlu6BN1FMj2umVyoc9I9L44eQytfaqqgBglnQxYeHCLW2bwmzD8D4h8swyIQD8+pShN8Li1X7Q61R1r3oLENxE9+p/coi3OIP6okK5xxn3Xe/s8xvd9fh3zNpvSGwKBgFTPmbkhkadyBB1XGURe19R7TcegSnE7ok+eFZPJFwv8PmVnlpeIzyY0e+5/I8ZdfX5J8P32Ridb8EQFe1+1lVQubwt46vW8ey9bmDjQPupfDR3eRyou+IS0h7eTpIWSLq+p7Uur01X8RWkr74PYVsxhRg8ezHrbJc7VE+jzi4ulAoGADhRcklkeHP/Y3t5KTwmewlDdw/ng/pXKIr3yDSSJ5qW8aw79INbmtqYWkbQcV4x9PHdt0QfWiRDj2m7EG1HBwbob4qZ3D4u1Obx7xQddGyqNXZ8FzMI15EovoTiI4aGT0JJ6JOtfWZ91MBjmYzSmClbPGveqcpt0l6l8m0617FUCgYA5BgwJqLkaDHWpTeOuxFaUWtEugOM5qzGwq9Q4p25YavKbIKdZ5bV9TdWCajuTdGLkfx2sQg46yrKftVNUCmja4vruXY5r3h/uCGkRBvRSOmFxnPvXqbAO+VS+o8t2rjA2hHbunC9uzJJ8nz7N6Vdx0af8juqu5dLb7GoKOYpWkQ=="
    private privateKey: CryptoKey | null = null;

    async init() {
        this.privateKey = await importPrivateKey(this.privateKeyBase64);
    }

    async getTimestamp(messageHash: string): Promise<{ tsaId: string; timestamp: number; signature: string }> {
        const timestamp = Date.now();
        const signature = await this.signHashAndTimestamp(messageHash, timestamp);
        return Promise.resolve({ tsaId: this.tsaId, timestamp, signature });
    }

    async signHashAndTimestamp(messageHash: string, timestamp: number): Promise<string> {
        if(!this.privateKey) {
            throw "MockTsaBackend instance should be initialized first";
        }
        const message = this.combineMessageHashAndTimestamp(messageHash, timestamp);
        return sign(message, this.privateKey);
    }

    combineMessageHashAndTimestamp(messageHash: string, timestamp: number): string {
        return messageHash + '_' + timestamp.toString();
    }
}
