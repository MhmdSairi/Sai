const crypto = require("crypto");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const { Headers: xlApiHeaders } = require("./xlapi.js");

// Untuk timezone dan waktu lokal
const moment = require("moment-timezone");

const Url = {
  base: "https://gede.ciam.xlaxiata.co.id",
};

class Headers {
  static formatAxTime(dateVal) {
    // Format: 2023-08-29T12:34:56.789+0700
    const ms = Math.floor(dateVal.millisecond());
    // moment format with milliseconds and offset without colon
    return dateVal.format(`YYYY-MM-DDTHH:mm:ss.SSSZZ`);
  }

  static axRequestAt() {
    // ambil sekarang dengan timezone lokal + 300 detik (5 menit)
    const now = moment.tz("Asia/Jakarta").add(300, "seconds");
    return [now, Headers.formatAxTime(now)];
  }

  static axDeviceId() {
    return uuidv4();
  }

  static axRequestId() {
    return uuidv4();
  }

  static axRequestDevice() {
    return "samsung";
  }

  static axRequestDeviceModel() {
    return "SM-S918B";
  }

  static getSystemLanguage() {
    const langs = ["en", "id"];
    return langs[Math.floor(Math.random() * langs.length)];
  }

  static getScreenResolution() {
    const resolutions = ["1080x2328", "720x1600", "1440x3200", "1080x2400"];
    return resolutions[Math.floor(Math.random() * resolutions.length)];
  }

  static getTzFormat() {
    const now = moment.tz("Asia/Jakarta");
    const offset = now.format("Z"); // "+07:00"
    return `GMT${offset}`;
  }

  static getLocalIp() {
    // Random IP lokal private range 192.168.x.x
    const randomOctet = () => Math.floor(Math.random() * 256);
    return `192.168.${randomOctet()}.${randomOctet()}`;
  }

  static encryptFingerprint(fingerprint, hmacKey = "18b4d589826af50241177961590e6693") {
    try {
      const key = Buffer.from(hmacKey, "utf8");
      const iv = Buffer.alloc(16, 0); // zero IV

      // AES-CBC PKCS7 padding (PKCS7 = PKCS5 for block size 16)
      const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
      let encrypted = cipher.update(fingerprint, "utf8", "base64");
      encrypted += cipher.final("base64");
      return encrypted;
    } catch (e) {
      return "";
    }
  }

  static decryptFingerprint(b64Ciphertext, hmacKey = "18b4d589826af50241177961590e6693") {
    try {
      const key = Buffer.from(hmacKey, "utf8");
      const iv = Buffer.alloc(16, 0);

      const encrypted = Buffer.from(b64Ciphertext, "base64");
      const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
      let decrypted = decipher.update(encrypted, null, "utf8");
      decrypted += decipher.final("utf8");
      return decrypted;
    } catch (e) {
      throw new Error(`Decrypt error: ${e.message}`);
    }
  }

  static axFingerprint(phoneNumber) {
    const manufacturers = [
      "samsung", "xiaomi", "huawei", "oppo", "vivo",
      "realme", "oneplus", "asus", "sony", "lg"
    ];

    const models = [
      "SM-S918B", "MI 10", "P30 Pro", "Reno5", "V20",
      "RMX2076", "GM1913", "X00TD", "Xperia 10", "LG G8"
    ];
    
    const androidReleases = ["10", "11", "12", "13"];
    const fontScale = (Math.random() * 0.5 + 0.75).toFixed(2); // 0.75 - 1.25

    const manufacturer = manufacturers[Math.floor(Math.random() * manufacturers.length)];
    const model = models[Math.floor(Math.random() * models.length)];
    const androidRelease = androidReleases[Math.floor(Math.random() * androidReleases.length)];
    const langCode = Headers.getSystemLanguage();
    const screenRes = Headers.getScreenResolution();
    const tzFormat = Headers.getTzFormat();
    const localIp = Headers.getLocalIp();
    const contact = phoneNumber;

    const fingerprint = [
      manufacturer,
      model,
      langCode,
      screenRes,
      tzFormat,
      localIp,
      fontScale.toString(),
      `Android ${androidRelease}`,
      contact,
    ].join("|");

    return Headers.encryptFingerprint(fingerprint);
  }

  static authorization(
    clientId = "9fc97ed1-6a30-48d5-9516-60c53ce3a135",
    secretKey = "YDWmF4LJj9XIKwQnzy2e2lb0tJQb29o3"
  ) {
    const plain = `${clientId}:${secretKey}`;
    return "Basic " + Buffer.from(plain).toString("base64");
  }

  static computeHmac(
    source,
    secret = "18b4d589826af50241177961590e6693",
    isBase64 = true,
    algorithm = "HMACSHA256"
  ) {
    const algoMap = {
      HMACSHA256: "sha256",
      HMACSHA1: "sha1",
      HMACMD5: "md5",
    };
    const algo = algoMap[algorithm.toUpperCase()];
    if (!algo) throw new Error(`Unsupported algorithm: ${algorithm}`);

    const hmac = crypto.createHmac(algo, secret);
    hmac.update(source);
    const raw = hmac.digest();

    if (isBase64) return raw.toString("base64");
    return raw.toString("hex");
  }

  static axApiSignature(phoneNumber, code, axTime) {
    const intervalSeconds = 300;
    const ts = Headers.formatAxTime(moment(axTime).add(intervalSeconds, "seconds"));
    const grantType = "password";
    const contactType = "SMS";
    const contact = phoneNumber;
    const scope = "openid";

    const source = ts + grantType + contactType + contact + String(code) + scope;
    return Headers.computeHmac(source);
  }

  static parsePhoneNumber(phoneNumber) {
    return phoneNumber.startsWith("62") ? phoneNumber : "62" + phoneNumber.slice(1);
  }

  static build(phoneNumber, subscriptionType = "PREPAID", code = "") {
    phoneNumber = Headers.parsePhoneNumber(phoneNumber);
    const [axTime, axFormatted] = Headers.axRequestAt();

    const headers = {
      "ax-request-at": axFormatted,
      "ax-device-id": Headers.axDeviceId(),
      "ax-request-id": Headers.axRequestId(),
      "ax-request-device": Headers.axRequestDevice(),
      "ax-request-device-model": Headers.axRequestDeviceModel(),
      "ax-fingerprint": Headers.axFingerprint(phoneNumber),
      "ax-substype": subscriptionType,
      Authorization: Headers.authorization(),
      "User-Agent": xlApiHeaders.userAgent(),
      "Content-Type": "application/json",
      Host: "gede.ciam.xlaxiata.co.id",
      Connection: "Keep-Alive",
      "Accept-Encoding": "gzip",
    };

    if (code) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      headers["ax-api-signature"] = Headers.axApiSignature(phoneNumber, code, axTime);
    }

    return headers;
  }
}

module.exports = { Url, Headers };

if (require.main === module) {
    const phoneNumber = "0817xxxx";
    const ciamHeaders = Headers.build(phoneNumber, "PREPAID", "738742");
    console.log(ciamHeaders);
}
