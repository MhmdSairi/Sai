const crypto = require('crypto');

const DEFAULT_DECRYPTION_KEY = "880d8e7e9b4b787aa50a3917b09fc0ec";

function sha256Hex(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
}

function b64UrlSafeDecode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return str;
}

function decrypt(xdata, xtime, key = DEFAULT_DECRYPTION_KEY) {
    const keyHex = sha256Hex(key).slice(0, 32);
    const keyBytes = Buffer.from(keyHex, 'utf8');

    const ivHex = sha256Hex(String(xtime)).slice(0, 16);
    const ivBytes = Buffer.from(ivHex, 'utf8');

    const safeXdata = b64UrlSafeDecode(xdata);
    const ctBuffer = Buffer.from(safeXdata, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBytes, ivBytes);
    decipher.setAutoPadding(true);

    let plaintext = decipher.update(ctBuffer, undefined, 'utf8') + decipher.final('utf8');

    // pretty-print JSON if applicable
    try {
        const obj = JSON.parse(plaintext);
        plaintext = JSON.stringify(obj, null, 2);
    } catch {}

    return plaintext;
}

// Fungsi handler Express langsung
module.exports = function decryptHandler(req, res) {
    const { xdata, xtime, key } = req.body;

    if (!xdata || !xtime) {
        return res.status(400).json({ error: 'xdata & xtime required' });
    }

    try {
        const plaintext = decrypt(xdata, xtime, key || DEFAULT_DECRYPTION_KEY);
        res.json({ plaintext, xtime });
    } catch (err) {
        res.status(500).json({ error: 'decryption failed', detail: err.message });
    }
}
