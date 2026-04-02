import { base64ToUint8Array, uint8ArrayToBase64 } from './stream-utils';

const SIGN_KEY_GENERATION_PARAMS: RsaHashedKeyGenParams = {
  name: 'RSASSA-PKCS1-v1_5',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

async function exportKeyToBase64(format: 'spki' | 'pkcs8', key: CryptoKey): Promise<string> {
  return uint8ArrayToBase64(new Uint8Array(await crypto.subtle.exportKey(format, key)));
}

export async function importPrivateKey(keyBase64Str: string): Promise<CryptoKey> {
  return importKey(keyBase64Str, 'pkcs8', 'sign');
}

export async function importPublicKey(keyBase64Str: string): Promise<CryptoKey> {
  return importKey(keyBase64Str, 'spki', 'verify');
}

async function importKey(
  keyBase64Str: string,
  format: 'pkcs8' | 'spki',
  keyUsage: 'sign' | 'verify'
): Promise<CryptoKey> {
  return crypto.subtle.importKey(format, base64ToUint8Array(keyBase64Str), SIGN_KEY_GENERATION_PARAMS, false, [
    keyUsage,
  ]);
}

// TODO: generateKeyPair ?
export async function generateRsaKeys(): Promise<{ privateKeyBase64: string; publicKeyBase64: string }> {
  const { publicKey, privateKey } = await crypto.subtle.generateKey(SIGN_KEY_GENERATION_PARAMS, true, [
    'sign',
    'verify',
  ]);
  return {
    publicKeyBase64: await exportKeyToBase64('spki', publicKey),
    privateKeyBase64: await exportKeyToBase64('pkcs8', privateKey),
  };
}

export async function sign(message: string, privateKey: CryptoKey): Promise<string> {
  const encoded = new TextEncoder().encode(message);
  const signature = await crypto.subtle.sign(SIGN_KEY_GENERATION_PARAMS, privateKey, encoded);
  return uint8ArrayToBase64(new Uint8Array(signature));
}

export async function verify(message: string, signature: string, publicKey: CryptoKey): Promise<boolean> {
  const encoded = new TextEncoder().encode(message);
  return crypto.subtle.verify(SIGN_KEY_GENERATION_PARAMS, publicKey, base64ToUint8Array(signature), encoded);
}
