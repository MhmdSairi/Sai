const axios = require("axios");
const ciamapi = require("./ciamapi.js");
const xlapi = require("./xlapi.js");
const payments = require("./payments.js");
const { encryptPaymentToken } = require("./enc_dec.js");

class Request {
  static async get(url, { headers = {}, params = {} } = {}) {
    try {
      const resp = await axios.get(url, {
        headers,
        params,
      });
      return resp;
    } catch (error) {
      const resp = error.response;
      return resp;
    }
  }

  static async post(url, { headers = {}, data = {}, params = {} } = {}) {
    try {
      const resp = await axios.post(url, data, {
        headers,
        params,
      });
      return resp;
    } catch (error) {
      const resp = error.response;
      return resp;
    }
  }
}


class MyXL {
    constructor(phoneNumber, subsType = "PREPAID", refreshToken = "") {
        this.phoneNumber = this.parsePhoneNumber(phoneNumber);
        this.subsType = subsType;
        this.refreshToken = refreshToken;
        this.idToken = "";
        this.accessToken = "";
    }

    static async init(phoneNumber, {
        subsType = "PREPAID",
        refreshToken = ""
    } = {}) {
        const myXL = new MyXL(phoneNumber, subsType, refreshToken);
        if (refreshToken) {
            await myXL.updateToken();
        }
        return myXL;
    }

    static isValidPhoneNumber(phoneNumber) {
        phoneNumber = phoneNumber.trim();
        if (!/^\d+$/.test(phoneNumber)) return false;
        if (phoneNumber.length < 10 || phoneNumber.length > 15) return false;
        if (!(phoneNumber.startsWith("0") || phoneNumber.startsWith("62"))) return false;
        return true;
    }

    parsePhoneNumber(phoneNumber) {
        return phoneNumber.startsWith("62") ? phoneNumber : "62" + phoneNumber.slice(1);
    }

    async requestOtp() {
        const url = `${ciamapi.Url.base}/realms/xl-ciam/auth/otp`;
        const headers = ciamapi.Headers.build(this.phoneNumber, this.subsType);
        const params = {
            contact: this.phoneNumber,
            contactType: "SMS",
            alternateContact: false,
        };

        const resp = await Request.get(url, {
            headers,
            params
        });
        return resp.data;
    }

    async confirmOtp(code) {
        const url = `${ciamapi.Url.base}/realms/xl-ciam/protocol/openid-connect/token`;
        const headers = ciamapi.Headers.build(this.phoneNumber, this.subsType, code);
        const data = new URLSearchParams({
            contactType: "SMS",
            code: String(code),
            grant_type: "password",
            contact: this.phoneNumber,
            scope: "openid",
        });

        const resp = await Request.post(url, {
            data,
            headers
        });
        const respJson = resp.data;

        this.idToken = respJson.id_token || "";
        this.refreshToken = respJson.refresh_token || "";
        this.accessToken = respJson.access_token || "";

        return respJson;
    }

    async updateToken() {
        const url = `${ciamapi.Url.base}/realms/xl-ciam/protocol/openid-connect/token`;
        const headers = ciamapi.Headers.build(this.phoneNumber, this.subsType);
        headers["Content-Type"] = "application/x-www-form-urlencoded";

        const data = new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: this.refreshToken,
        });

        const resp = await Request.post(url, {
            data,
            headers
        });
        const respJson = resp.data;

        this.idToken = respJson.id_token || "";
        this.refreshToken = respJson.refresh_token || "";
        this.accessToken = respJson.access_token || "";

        return [this.idToken, respJson];
    }

    async getQuotaDetails() {
        const url = `${xlapi.Url.base}/packages/quota-details`;
        const headers = xlapi.Headers.build(url, "POST", this.idToken);
        
        const data = xlapi.JsonBody.encrypt({
            lang: "en",
            is_enterprise: false,
            family_member_id: "",
        });

        const resp = await Request.post(url, {
            data,
            headers
        });

        const respJson = xlapi.JsonBody.decrypt(resp.data);
        return respJson;
    }

    async getPackageDetails(packageCode, isEnterprise=false, migrationType="") {
        const url = `${xlapi.Url.base}/xl-stores/options/detail`;
        const headers = xlapi.Headers.build(url, "POST", this.idToken);
        const data = xlapi.JsonBody.encrypt({
            lang: "en",
            is_enterprise: isEnterprise,
            family_role_hub: "",
            is_autobuy: false,
            is_migration: false,
            is_shareable: false,
            is_transaction_routine: false,
            is_upsell_pdp: false,
            migration_type: migrationType,
            package_family_code: "",
            package_option_code: packageCode,
            package_variant_code: "",
        });

        const resp = await Request.post(url, {
            data,
            headers
        });
        const respJson = xlapi.JsonBody.decrypt(resp.data);
        return respJson;
    }

    async getPackageList(familyCode, isEnterprise=false, migrationType="NONE") {
        const url = `${xlapi.Url.base}/xl-stores/options/list`;
        const headers = xlapi.Headers.build(url, "POST", this.idToken);
        const data = xlapi.JsonBody.encrypt({
            lang: "en",
            is_enterprise: isEnterprise,
            is_autobuy: false,
            is_dedicated_event: true,
            is_migration: false,
            is_pdlp: true,
            is_show_tagging_tab: true,
            is_transaction_routine: false,
            migration_type: migrationType,
            package_family_code: familyCode,
            referral_code: "",
        });

        const resp = await Request.post(url, {
            data,
            headers
        });
        const respJson = xlapi.JsonBody.decrypt(resp.data);
        return respJson;
    }

    async getBalances() {
        const url = xlapi.Url.base + "/packages/balance-and-credit";
        const headers = xlapi.Headers.build(url, "POST", this.idToken);

        const data = xlapi.JsonBody.encrypt({
            lang: "en",
            is_enterprise: false
        });

        const resp = await Request.post(url, { 
            data, 
            headers 
        });
        const respJson = xlapi.JsonBody.decrypt(resp.data);
        return respJson;
    }

    async paymentMethodsOption(packageCode, tokenConfirm) {
        const url = `${xlapi.Url.payment}/payment-methods-option`;
        const headers = xlapi.Headers.build(url, "POST", this.idToken);
        const data = xlapi.JsonBody.encrypt({
            lang: "en",
            is_enterprise: false,
            is_referral: false,
            payment_target: packageCode,
            payment_type: "PURCHASE",
            token_confirmation: tokenConfirm,
        });

        const resp = await Request.post(url, {
            data,
            headers
        });
        const respJson = xlapi.JsonBody.decrypt(resp.data);
        return respJson;
    }

    async paymentSettlement(
        paymentMethod,
        itemCode,
        itemName,
        itemPrice,
        totalAmount = null,
        walletNumber = "",
        paymentFor = "BUY_PACKAGE"
    ) {
        if (totalAmount === null) {
            totalAmount = itemPrice;
        }

        paymentMethod = paymentMethod.toUpperCase();

        const url = xlapi.Url.payment + payments.EndPoint.get(paymentMethod);

        const timestamp = Math.floor(Date.now() / 1000);
        const tokenPayment = encryptPaymentToken(String(timestamp), timestamp);
        const targetMethod = paymentMethod === payments.PaymentMethod.BALANCEV2 ? "BALANCE" : paymentMethod;

        const headers = xlapi.Headers.buildSettlement(
            url,
            "POST",
            this.idToken,
            this.accessToken,
            timestamp,
            itemCode,
            tokenPayment,
            targetMethod,
            paymentFor
        );

        const items = itemCode.map((code, i) => ({
            item_code: code,
            item_name: itemName[i],
            item_price: itemPrice[i],
            product_type: "",
            tax: 0,
        }));

        let data;
        if (paymentMethod === payments.PaymentMethod.BALANCE) {
            data = payments.Body.balance(this.accessToken, timestamp, items, totalAmount, tokenPayment, paymentFor);
        } else if (paymentMethod === payments.PaymentMethod.BALANCEV2) {
            data = payments.Body.balancev2(this.accessToken, timestamp, items, totalAmount, tokenPayment, paymentFor);
        } else {
            data = payments.Body.ewallet(
                this.accessToken,
                timestamp,
                items,
                totalAmount,
                tokenPayment,
                targetMethod,
                walletNumber,
                paymentFor
            );
        }

        const response = await Request.post(url, {
            data,
            headers
        });
        const respJson = xlapi.JsonBody.decrypt(response.data);
        return respJson;
    }

    async paymentPendingDetail(transactionCode) {
        const url = `${xlapi.Url.payment}/pending-detail`;
        const headers = xlapi.Headers.build(url, "POST", this.idToken);

        const data = xlapi.JsonBody.encrypt({
            lang: "en",
            is_enterprise: false,
            status: "",
            transaction_id: transactionCode,
        });

        const resp = await Request.post(url, {
            data,
            headers
        });
        const respJson = xlapi.JsonBody.decrypt(resp.data);
        return respJson;
    }
}

module.exports = MyXL;
