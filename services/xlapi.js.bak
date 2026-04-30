const crypto = require("crypto");
const moment = require("moment-timezone");

const { URL } = require("url");
const {
    encryptAesCbc,
    decryptAesCbc,
    encryptPaymentToken,
    decryptPaymentToken,
    encryptPaymentAuthId,
    decryptPaymentAuthId,
    encryptTokenPayment,
    decryptTokenPayment
} = require("./enc_dec.js"); // pastikan kamu punya modul ini

// Dinamis dari environment variable, fallback ke default jika tidak ada
let APP_VERSION = "8.9.1";
let APP_BUILD_NUMBER = "1204";
const APP_API_KEY = "vT8tINqHaOxXbGE7eOWAhA==";

function timestamp() {
    return Math.floor(Date.now() / 1000);
}

class HmacKey {
    static DEFAULT = "mU1Y4n1vBjf3M7tMnRkFU08mVyUJHed8B5En3EAniu1mXLixeuASmBmKnkyzVziOye7rG5nIekMdthensbQMcOJ6SLnrkGyfXALD7mrBC6vuWv6G01pmD3XlU5rT7Tzx";
}

class Url {
    static default = "https://api.myxl.xlaxiata.co.id";
    static base = "https://api.myxl.xlaxiata.co.id/api/v8";
    static basev9 = "https://api.myxl.xlaxiata.co.id/api/v9";
    static misc = "https://api.myxl.xlaxiata.co.id/misc/api/v8";
    static payment = "https://api.myxl.xlaxiata.co.id/payments/api/v8";
    static store = "https://api.myxl.xlaxiata.co.id/store/api/v8";
}

class XSignature {
    static signHmac(source, secret, algorithm, isBase64 = false) {
        if (!secret) secret = HmacKey.DEFAULT;

        let hashName;
        if (algorithm.toLowerCase().startsWith("hmac")) {
            hashName = algorithm.slice(4).toLowerCase();
        } else {
            hashName = algorithm.toLowerCase();
        }

        if (!crypto.getHashes().includes(hashName)) {
            throw new Error(`Unsupported HMAC algorithm: ${algorithm}`);
        }

        const hmac = crypto.createHmac(hashName, Buffer.from(secret, "utf8"));
        hmac.update(Buffer.from(source, "utf8"));
        const raw = hmac.digest();

        if (isBase64) {
            return raw.toString("base64");
        } else {
            return raw.toString("hex");
        }
    }

    static default(
        path,
        method,
        {
            key = HmacKey.DEFAULT,
            idToken = null,
            algorithm = "HmacSHA512",
            isBase64 = false
        } = {}
    ) {
        const signatureTime = String(timestamp());
        const sessionToken = idToken || "";

        const source = [sessionToken, signatureTime].join(";") + ";";
        const secret = [key, sessionToken, method, path, signatureTime].join(";");

        const signature = XSignature.signHmac(source, secret, algorithm, isBase64);
        return [signature, signatureTime];
    }

    static settlement(path, method, accessToken, timestamp, packageCode, tokenPayment, paymentMethod, paymentFor = "BUY_PACKAGE", key = HmacKey.DEFAULT, algorithm = "HmacSHA512", isBase64 = false) {
        const signatureTime = String(timestamp);

        const packageCodeStr = packageCode.join(";");
        const source = [accessToken, tokenPayment, signatureTime, paymentFor, paymentMethod, packageCodeStr].join(";") + ";";
        const secret = [key, decryptTokenPayment(tokenPayment), method, path, signatureTime].join(";");

        const signature = XSignature.signHmac(source, secret, algorithm, isBase64);

        return [signature, signatureTime];
    }
}

class Headers {
    static xRequestId() {
        return crypto.randomUUID();
    }

    static xRequestAt() {
        // Ambil waktu sekarang di timezone Asia/Jakarta
        const now = moment().tz("Asia/Jakarta");
        // Format: 2023-08-29T12:34:56.789+07:00
        return now.format("YYYY-MM-DDTHH:mm:ss.SSSZ");
    }

    static xVersionApp() {
        return APP_VERSION;
    }

    static xBuildNumber() {
        return APP_BUILD_NUMBER;
    }

    static xApiKey() {
        return APP_API_KEY;
    }

    static xHv() {
        return "v3";
    }

    static userAgent() {
        return `myXL / ${APP_VERSION}(${APP_BUILD_NUMBER}); com.android.vending; (samsung; SM-S918B; SDK 29; Android 10)`;
    }

    static build(url, method, idToken = null) {
        const parsedUrl = new URL(url);
        const path = parsedUrl.pathname.startsWith("/") ? parsedUrl.pathname.slice(1) : parsedUrl.pathname;
        method = method.toUpperCase();

        const [xSign, xSignTime] = XSignature.default(path, method, { idToken: idToken });

        const headers = {
            "X-Request-Id": Headers.xRequestId(),
            "X-Request-At": Headers.xRequestAt(),
            "X-Version-App": Headers.xVersionApp(),
            "X-Api-Key": Headers.xApiKey(),
            "X-Hv": Headers.xHv(),
            "X-Signature-Time": xSignTime,
            "X-Signature": xSign,
            "User-Agent": Headers.userAgent(),
            "Content-Type": "application/json; charset=utf-8",
            Host: "api.myxl.xlaxiata.co.id",
            Connection: "Keep-Alive",
            "Accept-Encoding": "gzip",
        };

        if (idToken) {
            headers["Authorization"] = `Bearer ${idToken}`;
        }

        return headers;
    }

    static buildSettlement(url, method, idToken, accessToken, timestamp, packageCode, tokenPayment, paymentMethod, paymentFor = "BUY_PACKAGE") {
        const parsedUrl = new URL(url);
        const path = parsedUrl.pathname.startsWith("/") ? parsedUrl.pathname.slice(1) : parsedUrl.pathname;
        method = method.toUpperCase();

        const [xSign, xSignTime] = XSignature.settlement(path, method, accessToken, timestamp, packageCode, tokenPayment, paymentMethod, paymentFor);

        const headers = {
            "X-REQUEST-ID": Headers.xRequestId(),
            "X-REQUEST-AT": Headers.xRequestAt(),
            "X-VERSION-APP": Headers.xVersionApp(),
            "x-api-key": Headers.xApiKey(),
            "x-hv": Headers.xHv(),
            "x-signature-time": xSignTime,
            "x-signature": xSign,
            Authorization: `Bearer ${idToken}`,
            "User-Agent": Headers.userAgent(),
            "Content-Type": "application/json; charset=utf-8",
            Host: "api.myxl.xlaxiata.co.id",
            Connection: "Keep-Alive",
            "Accept-Encoding": "gzip",
        };

        return headers;
    }
}

class JsonBody {
    static encrypt(data) {
        const plain = JSON.stringify(data);
        const ts = timestamp();

        const xdata = encryptAesCbc(plain, ts, "880d8e7e9b4b787aa50a3917b09fc0ec");
        return { xdata, xtime: ts };
    }

    static decrypt(data) {
        const xdata = data.xdata || "";
        const xtime = data.xtime || 0;

        const plain = decryptAesCbc(xdata, xtime, "880d8e7e9b4b787aa50a3917b09fc0ec");
        const respData = JSON.parse(plain);
        if (respData.status !== 'SUCCESS') {
            const respDataError = JSON.stringify(respData);
            throw new Error(respDataError);
        }
        return respData.data;
    }
}

// Setter untuk update APP_VERSION dan APP_BUILD_NUMBER secara dinamis dari kode
function setAppVersion(ver, build) {
    APP_VERSION = ver;
    APP_BUILD_NUMBER = build;
}

module.exports = {
    HmacKey,
    Url,
    XSignature,
    Headers,
    JsonBody,
    setAppVersion
}
