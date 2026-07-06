import * as crypto from 'crypto';

let rsaKeys: { privateKey: string; publicKey: string } | null = null;

export function getRsaKeys(): { privateKey: string; publicKey: string } {
  if (rsaKeys) {
    return rsaKeys;
  }

  const envPrivateKey = process.env.JWT_PRIVATE_KEY;
  const envPublicKey = process.env.JWT_PUBLIC_KEY;

  if (envPrivateKey && envPublicKey) {
    rsaKeys = {
      privateKey: envPrivateKey.replace(/\\n/g, '\n'),
      publicKey: envPublicKey.replace(/\\n/g, '\n'),
    };
    return rsaKeys;
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  rsaKeys = { privateKey, publicKey };
  return rsaKeys;
}
