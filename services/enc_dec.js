const crypto = require("crypto");

const DEFAULT_KEY = "880d8e7e9b4b787aa50a3917b09fc0ec";
const DEFAULT_PAYMENT_ENCRYPTION_KEY = DEFAULT_KEY;
const PAYMENT_HASH_KEY = "#ae-hei_9Tee6he+Ik3Gais5=";

function getCurrentTimestamp() {
  return Math.floor(Date.now() / 1000).toString();
}

function sha256Hex(s, encoding = "utf8") {
  return crypto.createHash("sha256").update(Buffer.from(s, encoding)).digest("hex");
}

function pkcs7Pad(buffer) {
  const blockSize = 16;
  const padding = blockSize - (buffer.length % blockSize);
  const padBuff = Buffer.alloc(padding, padding);
  return Buffer.concat([buffer, padBuff]);
}

function pkcs7Unpad(buffer) {
  const padding = buffer[buffer.length - 1];
  if (padding < 1 || padding > 16) {
    throw new Error("Invalid padding");
  }
  // Verify padding bytes
  for (let i = buffer.length - padding; i < buffer.length; i++) {
    if (buffer[i] !== padding) {
      throw new Error("Invalid padding bytes");
    }
  }
  return buffer.slice(0, buffer.length - padding);
}

function base64UrlEncode(buffer) {
  return buffer.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return Buffer.from(str, "base64");
}

// --------------------------------------------
// encrypt_token_payment
// Format: <base64 urlsafe ciphertext>
// Key: sha256(key)[:16]
// IV: sha256(timestamp)[:16]
// --------------------------------------------
function encryptTokenPayment(plaintext, timestamp, key = DEFAULT_PAYMENT_ENCRYPTION_KEY, flag = 8) {
  const aesKey = Buffer.from(sha256Hex(key).slice(0, 16), "utf8");
  const iv = Buffer.from(sha256Hex(String(timestamp)).slice(0, 16), "utf8");

  const ptBuffer = Buffer.from(plaintext, "utf8");
  const padded = pkcs7Pad(ptBuffer);

  const cipher = crypto.createCipheriv("aes-128-cbc", aesKey, iv);
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(padded), cipher.final()]);

  return base64UrlEncode(encrypted);
}

// --------------------------------------------
// decrypt_token_payment
// Input: base64 urlsafe ciphertext
// Key: sha256(key)[:16]
// IV: sha256(timestamp)[:16]
// --------------------------------------------
function decryptTokenPayment(encrypted, key = DEFAULT_PAYMENT_ENCRYPTION_KEY, flag = 8) {
  const aesKey = Buffer.from(sha256Hex(key).slice(0, 16), "utf8");
  const iv = encrypted.slice(-16);

  const ct = encrypted.slice(0, -16);
  const ctBuffer = base64UrlDecode(ct);

  const decipher = crypto.createDecipheriv("aes-128-cbc", aesKey, iv);
  const plain = Buffer.concat([decipher.update(ctBuffer), decipher.final()]);

  return plain.toString("utf8");
}

// --------------------------------------------
// encrypt_payment_token
// Key: sha256(encryption_key)[:16]
// IV: sha256(timestamp)[:16]
// Output: base64 urlsafe ciphertext + iv hex (first 16 chars)
// --------------------------------------------
function encryptPaymentToken(
  plaintext, 
  timestamp, 
  encryptionKey = DEFAULT_PAYMENT_ENCRYPTION_KEY,
  suffix = PAYMENT_HASH_KEY
) {
  const keyHex = sha256Hex(encryptionKey);
  const keyBytes = Buffer.from(keyHex, "utf8").slice(0, 16);

  const ivHex = sha256Hex(String(timestamp));
  const ivBytes = Buffer.from(ivHex, "utf8").slice(0, 16);

  const ptBuffer = Buffer.from(plaintext + suffix, "utf8");
  const padded = pkcs7Pad(ptBuffer);

  const cipher = crypto.createCipheriv("aes-128-cbc", keyBytes, ivBytes);
  cipher.setAutoPadding(false);
  const ctBuffer = Buffer.concat([cipher.update(padded), cipher.final()]);

  const base64Url = base64UrlEncode(ctBuffer);

  return base64Url + ivHex.slice(0, 16);
}

// --------------------------------------------
// decrypt_payment_token
// Input: base64 urlsafe ciphertext + 16 hex IV
// Key: sha256(encryption_key)[:16]
// timestamp: used to derive IV (must match)
// --------------------------------------------
function decryptPaymentToken(token, timestamp, encryptionKey = DEFAULT_PAYMENT_ENCRYPTION_KEY, flag = 8) {
  const keyHex = sha256Hex(encryptionKey);
  const keyBytes = Buffer.from(keyHex, "utf8").slice(0, 16);

  const ivHex = sha256Hex(String(timestamp));
  const ivBytes = Buffer.from(ivHex, "utf8").slice(0, 16);

  const timeHash = token.slice(-16);
  const cipherTextBase64 = token.slice(0, -16);
  const ctBuffer = base64UrlDecode(cipherTextBase64);

  const decipher = crypto.createDecipheriv("aes-128-cbc", keyBytes, ivBytes);
  decipher.setAutoPadding(false);
  const decryptedPadded = Buffer.concat([decipher.update(ctBuffer), decipher.final()]);

  const decrypted = pkcs7Unpad(decryptedPadded);

  return decrypted.toString("utf8");
}

const encryptPaymentAuthId = encryptPaymentToken;
const decryptPaymentAuthId = decryptPaymentToken;

// --------------------------------------------
// encrypt_aes_cbc
// Key: sha256(encryption_key)[:32]
// IV: sha256(timestamp)[:16]
// Output: base64 urlsafe ciphertext
// --------------------------------------------
function encryptAesCbc(plaintext, timestamp, encryptionKey = DEFAULT_KEY) {
  if (!encryptionKey || !encryptionKey.trim()) {
    throw new Error("`encryptionKey` must be a non-empty string");
  }

  const keyHex = sha256Hex(encryptionKey);
  const keyBytes = Buffer.from(keyHex, "utf8").slice(0, 32);

  const ivHex16 = sha256Hex(String(timestamp)).slice(0, 16);
  const ivBytes = Buffer.from(ivHex16, "utf8");

  const ptBuffer = Buffer.from(plaintext, "utf8");
  const padded = pkcs7Pad(ptBuffer);

  const cipher = crypto.createCipheriv("aes-256-cbc", keyBytes, ivBytes);
  cipher.setAutoPadding(false);
  const ctBuffer = Buffer.concat([cipher.update(padded), cipher.final()]);

  return base64UrlEncode(ctBuffer);
}

// --------------------------------------------
// decrypt_aes_cbc
// Input: base64 urlsafe ciphertext
// Key: sha256(encryption_key)[:32]
// IV: sha256(timestamp)[:16]
// --------------------------------------------
function decryptAesCbc(ciphertextB64, timestamp, encryptionKey = DEFAULT_KEY) {
  if (!encryptionKey || !encryptionKey.trim()) {
    throw new Error("Please supply encryptionKey");
  }

  const keyHex = sha256Hex(encryptionKey);
  const keyBytes = Buffer.from(keyHex, "utf8").slice(0, 32);

  const ivHex16 = sha256Hex(String(timestamp)).slice(0, 16);
  const ivBytes = Buffer.from(ivHex16, "utf8");

  const ctBuffer = base64UrlDecode(ciphertextB64);

  const decipher = crypto.createDecipheriv("aes-256-cbc", keyBytes, ivBytes);
  decipher.setAutoPadding(false);
  const decryptedPadded = Buffer.concat([decipher.update(ctBuffer), decipher.final()]);

  const decrypted = pkcs7Unpad(decryptedPadded);

  return decrypted.toString("utf8");
}

// ------------------------------
// Export semua fungsi
// ------------------------------
module.exports = {
  getCurrentTimestamp,
  sha256Hex,
  encryptTokenPayment,
  decryptTokenPayment,
  encryptPaymentToken,
  decryptPaymentToken,
  encryptPaymentAuthId,
  decryptPaymentAuthId,
  encryptAesCbc,
  decryptAesCbc,
};
