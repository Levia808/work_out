import nodeCrypto, { createHash, webcrypto } from 'node:crypto';

// Vite 7 uses Node 20.19+'s synchronous crypto.hash API. Keep local
// development/builds usable on the system Node while CI can use native crypto.
const hash = (algorithm, data, outputEncoding = 'hex') =>
  createHash(algorithm).update(data).digest(outputEncoding);

if (!nodeCrypto.hash) nodeCrypto.hash = hash;
if (!globalThis.crypto) globalThis.crypto = webcrypto;
if (!globalThis.crypto.hash) globalThis.crypto.hash = hash;
