const crypto = require('crypto');

const TOKEN_ENCRYPTION_KEY = '880d8e7e9b4b787aa50a3917b09fc0ec';
const TOKEN_HASH_KEY = 'ae-hei_9Tee6he+Ik3Gais5=';
const SIGNATURE_METHOD = 'POST';
const SIGNATURE_HASH_KEY = 'dem1Z3e0e9m7Jh9frpx8hZY78Qz8Vzj8FgcaaWAiNQar8TFFAURMaYES5TdkNnvyQy8frSvpNBavqY7yLY1intx3RxSN3upfiGuVLMCu9aBiF3GSyH8V96rRYcmvCwSj';
const SIGNATURE_ALGORITHM = 'sha512';
const SIGNATURE_IS_BASE64 = false;

// ... (semua fungsi helper Anda tetap di sini, tidak perlu diubah) ...
function sha256Hex(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function b64UrlSafeEncode(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlSafeDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return Buffer.from(str, 'base64');
}

function encryptToken(plaintext, timestamp, encryptionKey = TOKEN_ENCRYPTION_KEY) {
    const timestampString = String(timestamp);
    const keyHex = sha256Hex(encryptionKey).slice(0, 16);
    const keyBytes = Buffer.from(keyHex, 'utf8');
    const ivHex = sha256Hex(timestampString).slice(0, 16);
    const ivBytes = Buffer.from(ivHex, 'utf8');
    const plainTextBytes = Buffer.from(plaintext, 'utf8');
    const cipher = crypto.createCipheriv('aes-128-cbc', keyBytes, ivBytes);
    const cipherText = Buffer.concat([cipher.update(plainTextBytes), cipher.final()]);
    return b64UrlSafeEncode(cipherText) + ivHex.slice(0, 16);
}

function decryptToken(encrypted, encryptionKey = TOKEN_ENCRYPTION_KEY) {
    const ivHex = encrypted.slice(-16);
    const ivBytes = Buffer.from(ivHex, 'utf8');
    const ctBuffer = b64UrlSafeDecode(encrypted.slice(0, -16));
    const keyHex = sha256Hex(encryptionKey).slice(0, 16);
    const keyBytes = Buffer.from(keyHex, 'utf8');
    const decipher = crypto.createDecipheriv('aes-128-cbc', keyBytes, ivBytes);
    decipher.setAutoPadding(true);
    const decrypted = decipher.update(ctBuffer, undefined, 'utf8') + decipher.final('utf8');
    return decrypted;
}

function signHmac(source, secret, algorithm = SIGNATURE_ALGORITHM, isBase64 = SIGNATURE_IS_BASE64) {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(source, 'utf8');
    const raw = hmac.digest();
    return isBase64 ? raw.toString('base64') : raw.toString('hex');
}

function createEncryptedToken() {
    const timestamp = Math.floor(Date.now() / 1000);
    const plaintext = `${timestamp}#${TOKEN_HASH_KEY}`;
    const token = encryptToken(plaintext, timestamp);
    return { token, timestamp };
}

function signatureSettlement({
    accessToken,
    packageCode,
    paymentMethod,
    key = SIGNATURE_HASH_KEY,
    method = SIGNATURE_METHOD,
    algorithm = SIGNATURE_ALGORITHM,
    isBase64 = SIGNATURE_IS_BASE64,
}) {
    const paymentFor = 'BUY_PACKAGE';
    const { token, timestamp } = createEncryptedToken();
    const signatureTime = String(timestamp);
    const paymentMethodUpper = paymentMethod.toUpperCase();
    const path = "payments/api/v8" + (
        paymentMethodUpper === "BALANCE" ? "/settlement-balance" :
        paymentMethodUpper === "QRIS" ? "/settlement-multipayment/qris" :
        "/settlement-multipayment/ewallet"
    );
    const packageCodeString = Array.isArray(packageCode) ? packageCode.join(";") : packageCode;
    const source = [accessToken, token, signatureTime, paymentFor, paymentMethodUpper, packageCodeString].join(";") + ";";
    const secret = [key, decryptToken(token), method, path, signatureTime].join(";");
    const signature = signHmac(source, secret, algorithm, isBase64);
    if (paymentMethodUpper === "BALANCE") {
        return {
            x_sign: signature,
            x_signtime: signatureTime,
            timestamp: timestamp,
            encrypted_authentication_id: token,
            encrypted_payment_token: token,
            token_payment: token,
            access_token: accessToken
        };
    } else {
        return {
            x_sign: signature,
            x_signtime: signatureTime,
            timestamp: timestamp,
            verification_token: token,
            access_token: accessToken
        };
    }
}

module.exports = function settlementSignV2Handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { accessToken, packageCode, paymentMethod } = req.body;

    if (!accessToken || !packageCode || !paymentMethod) {
        return res.status(400).json({ error: 'accessToken, packageCode, & paymentMethod are required!' });
    }

    try {
        const signature = signatureSettlement({
            accessToken,
            packageCode,
            paymentMethod
        });
        res.json(signature);
    } catch (err) {
        res.status(500).json({ error: 'create signature settlement failed', detail: err.message, stack: err.stack });
    }
};
