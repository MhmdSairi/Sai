const crypto = require('crypto');

const SIGNATURE_HASH_KEY = 'dem1Z3e0e9m7Jh9frpx8hZY78Qz8Vzj8FgcaaWAiNQar8TFFAURMaYES5TdkNnvyQy8frSvpNBavqY7yLY1intx3RxSN3upfiGuVLMCu9aBiF3GSyH8V96rRYcmvCwSj';
const SIGNATURE_ALGORITHM = 'sha512';
const SIGNATURE_IS_BASE64 = false;

function signHmac(source, secret, algorithm = SIGNATURE_ALGORITHM, isBase64 = SIGNATURE_IS_BASE64) {
    const hmac = crypto.createHmac(algorithm, secret);
    hmac.update(source, 'utf8');
    const raw = hmac.digest();
    return isBase64 ? raw.toString('base64') : raw.toString('hex');
}

function signatureDefault({
    path,
    method,
    idtoken = "",
    key = SIGNATURE_HASH_KEY,
    algorithm = SIGNATURE_ALGORITHM,
    isBase64 = SIGNATURE_IS_BASE64
}) {
    const methodUpper = method.toUpperCase();
    const signatureTime = Math.floor(Date.now() / 1000).toString();
    const sessionToken = idtoken || "";
    
    const source = `${sessionToken};${signatureTime};`;
    const secret = `${key};${sessionToken};${methodUpper};${path};${signatureTime}`;
    const signature = signHmac(source, secret, algorithm, isBase64);
    return { x_sign: signature, x_signtime: signatureTime };
}

module.exports = function defaultSignatureHandler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { path, method, idtoken } = req.body;

    if (!path || !method) {
        return res.status(400).json({ error: 'path & method is required!' });
    }

    try {
        const signature = signatureDefault({
            path,
            method,
            idtoken
        });
        res.json(signature);
    } catch (err) {
        res.status(500).json({ error: 'create signature default failed', detail: err.message });
    }
};
