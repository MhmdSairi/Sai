const crypto = require("crypto");
const moment = require("moment-timezone");
const { v4: uuidv4 } = require("uuid");

// Konfigurasi (sama seperti di kode Java)
const Config = {
    BASE_CIAM_URL: "https://gede.ciam.xlaxiata.co.id",
    BASIC_AUTH: "OWZjOTdlZDEtNmEzMC00OGQ1LTk1MTYtNjBjNTNjZTNhMTM1OllEV21GNExKajlYSUt3UW56eTJlMmxiMHRKUWIyOW8z",
    AX_FP_KEY: "18b4d589826af50241177961590e6693",
    UA: "myXL / 8.9.0(1202); com.android.vending; (samsung; SM-N935F; SDK 33; Android 13)",
    AX_API_SIG_KEY: "18b4d589826af50241177961590e6693"
};

// Cache untuk menyimpan fingerprint dan deviceId per nomor telepon (biar konsisten)
const fingerprintCache = new Map();

class CryptoHelper {
    static md5(str) {
        return crypto.createHash("md5").update(str).digest("hex");
    }

    static hmacSha256Base64(keyAscii, data) {
        const hmac = crypto.createHmac("sha256", keyAscii);
        hmac.update(data);
        return hmac.digest("base64");
    }

    // Format timestamp dengan colon (+07:00), milidetik 2 digit (untuk request OTP)
    static formatWithColon(date) {
        const m = moment(date).tz("Asia/Jakarta");
        const ms2Digit = Math.floor(m.milliseconds() / 10).toString().padStart(2, '0');
        return m.format("YYYY-MM-DDTHH:mm:ss.") + ms2Digit + m.format("Z");
    }

    // Format timestamp tanpa colon (+0700), milidetik 3 digit (untuk signature dan header submit)
    static formatWithoutColon(date) {
        const m = moment(date).tz("Asia/Jakarta");
        return m.format("YYYY-MM-DDTHH:mm:ss.SSS") + m.format("ZZ");
    }

    static encryptFingerprint(plaintext, keyAscii) {
        const key = Buffer.from(keyAscii, "ascii");
        const iv = Buffer.alloc(16, 0);
        const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
        let encrypted = cipher.update(plaintext, "utf8", "base64");
        encrypted += cipher.final("base64");
        return encrypted;
    }

    // Membuat fingerprint dan deviceId (sekali per nomor, disimpan di cache)
    static generateFingerprintAndDeviceId(msisdn) {
        if (fingerprintCache.has(msisdn)) {
            return fingerprintCache.get(msisdn);
        }
        // Generate random sekali untuk nomor ini (seperti SharedPreferences di Java)
        const randomNum = () => Math.floor(1000 + Math.random() * 9000);
        const manufacturer = `samsung${randomNum()}`;
        const model = `SM-N93${randomNum()}`;
        const lang = "en";
        const resolution = "720x1540";
        const tzShort = "GMT07:00";
        const ip = "192.169.69.69";
        const fontScale = "1.0";
        const androidRelease = "13";
        const plain = `${manufacturer}|${model}|${lang}|${resolution}|${tzShort}|${ip}|${fontScale}|Android ${androidRelease}|${msisdn}`;
        const fingerprint = this.encryptFingerprint(plain, Config.AX_FP_KEY);
        const deviceId = this.md5(fingerprint);
        const result = { fingerprint, deviceId };
        fingerprintCache.set(msisdn, result);
        return result;
    }
}

const Url = {
    base: Config.BASE_CIAM_URL,
};

class Headers {
    static parsePhoneNumber(phoneNumber) {
        return phoneNumber.startsWith("62") ? phoneNumber : "62" + phoneNumber.slice(1);
    }

    static build(phoneNumber, subscriptionType = "PREPAID", code = "") {
        phoneNumber = this.parsePhoneNumber(phoneNumber);
        const { fingerprint, deviceId } = CryptoHelper.generateFingerprintAndDeviceId(phoneNumber);

        const now = new Date();
        let axFormatted;
        if (code) {
            // Submit OTP: header ax-request-at = sekarang - 5 menit (format tanpa colon)
            const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
            axFormatted = CryptoHelper.formatWithoutColon(fiveMinutesAgo);
        } else {
            // Request OTP: header ax-request-at = sekarang (format dengan colon)
            axFormatted = CryptoHelper.formatWithColon(now);
        }

        const headers = {
            "Authorization": `Basic ${Config.BASIC_AUTH}`,
            "Ax-Device-Id": deviceId,
            "Ax-Fingerprint": fingerprint,
            "Ax-Request-At": axFormatted,
            "Ax-Request-Device": "samsung",
            "Ax-Request-Device-Model": "SM-N935F",
            "Ax-Request-Id": uuidv4(),
            "Ax-Substype": subscriptionType,
            "User-Agent": Config.UA,
            "Host": "gede.ciam.xlaxiata.co.id",
            "Connection": "Keep-Alive",
        };

        if (code) {
            headers["Content-Type"] = "application/x-www-form-urlencoded";
            // Signature dihitung dari waktu sekarang (format tanpa colon)
            const tsForSign = CryptoHelper.formatWithoutColon(now);
            const grantType = "password";
            const contactType = "SMS";
            const contact = phoneNumber;
            const scope = "openid";
            const source = tsForSign + grantType + contactType + contact + String(code) + scope;
            headers["Ax-Api-Signature"] = CryptoHelper.hmacSha256Base64(Config.AX_API_SIG_KEY, source);
        } else {
            headers["Content-Type"] = "application/json";
        }

        return headers;
    }
}

module.exports = { Url, Headers };

// ========== BAGIAN TESTING (TIDAK MEMPENGARUHI EKSPOR) ==========
if (require.main === module) {
    const readline = require("readline/promises");
    const { stdin: input, stdout: output } = require("process");

    class ApiClient {
        constructor(msisdn) {
            this.msisdn = Headers.parsePhoneNumber(msisdn);
        }
        async requestOtp() {
            const url = new URL(`${Url.base}/realms/xl-ciam/auth/otp`);
            url.searchParams.append("contact", this.msisdn);
            url.searchParams.append("contactType", "SMS");
            url.searchParams.append("alternateContact", "false");
            const headers = Headers.build(this.msisdn, "PREPAID");
            const response = await fetch(url.toString(), { method: "GET", headers });
            const body = await response.text();
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`);
            return body;
        }
        async submitOtp(code) {
            const url = `${Url.base}/realms/xl-ciam/protocol/openid-connect/token`;
            const headers = Headers.build(this.msisdn, "PREPAID", code);
            const bodyParams = new URLSearchParams({
                contactType: "SMS",
                code: String(code),
                grant_type: "password",
                contact: this.msisdn,
                scope: "openid",
            });
            const response = await fetch(url, { method: "POST", headers, body: bodyParams });
            const body = await response.text();
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${body}`);
            return body;
        }
    }

    (async () => {
        const rl = readline.createInterface({ input, output });
        try {
            console.log("=== XL OTP Client ===\n");
            const phoneNumber = await rl.question("Masukkan nomor HP (contoh: 08123456789): ");
            if (!phoneNumber) throw new Error("Nomor HP tidak boleh kosong.");
            const client = new ApiClient(phoneNumber);
            console.log("\nMengirim request OTP...");
            const otpResponse = await client.requestOtp();
            console.log("Response request OTP:", otpResponse);
            const otpCode = await rl.question("\nMasukkan kode OTP yang diterima: ");
            if (!otpCode) throw new Error("Kode OTP tidak boleh kosong.");
            console.log("\nMengirim submit OTP...");
            const submitResponse = await client.submitOtp(otpCode);
            console.log("Response submit OTP:", submitResponse);
            console.log("\n✓ Proses selesai.");
        } catch (err) {
            console.error("\n❌ Error:", err.message);
        } finally {
            rl.close();
        }
    })();
}
