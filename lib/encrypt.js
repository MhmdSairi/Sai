const crypto = require('crypto');

const DEFAULT_ENCRYPTION_KEY = "880d8e7e9b4b787aa50a3917b09fc0ec";

function sha256Hex(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function b64UrlSafeEncode(str) {
    return str.replace(/\+/g, '-').replace(/\//g, '_');
}

function encrypt(plaintext, timestamp, key = DEFAULT_ENCRYPTION_KEY) {
    let pt = plaintext;
    try {
        pt = JSON.stringify(JSON.parse(plaintext));
    } catch (_) {}

    const keyHex = sha256Hex(key).slice(0, 32);
    const keyBytes = Buffer.from(keyHex, 'utf8');

    const ivHex = sha256Hex(String(timestamp)).slice(0, 16);
    const ivBytes = Buffer.from(ivHex, 'utf8');

    const ptBytes = Buffer.from(pt, 'utf8');

    const cipher = crypto.createCipheriv('aes-256-cbc', keyBytes, ivBytes);
    const cipherText = Buffer.concat([cipher.update(ptBytes), cipher.final()]);

    const cipherB64 = cipherText.toString('base64');
    const xdata = b64UrlSafeEncode(cipherB64);

    return { xdata, xtime: timestamp };
}

// Fungsi handler Express langsung
module.exports = function encryptHandler(req, res) {
    const { plaintext, timestamp, key } = req.body;

    if (!plaintext || !timestamp) {
        return res.status(400).json({ error: 'plaintext & timestamp required' });
    }

    try {
        const result = encrypt(plaintext, timestamp, key || DEFAULT_ENCRYPTION_KEY);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'encryption failed', detail: err });
    }
}
