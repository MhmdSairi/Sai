const xlapi = require("./xlapi");
const { encryptPaymentToken } = require("./enc_dec");

const PaymentMethod = {
    BALANCEV2: "BALANCEV2",
    BALANCE: "BALANCE",
    DANA: "DANA",
    OVO: "OVO",
    GOPAY: "GOPAY",
    SHOPEEPAY: "SHOPEEPAY",
    QRIS: "QRIS",
};

const PaymentMethodEwallet = {
    DANA: "DANA",
    OVO: "OVO",
    GOPAY: "GOPAY",
    SHOPEEPAY: "SHOPEEPAY",
    QRIS: "QRIS",
};

const EndPoint = {
    BALANCEV2: "/settlement-multipayment",
    BALANCE: "/settlement-balance",
    EWALLET: "/settlement-multipayment/ewallet",
    QRIS: "/settlement-multipayment/qris",

    get(paymentMethod) {
        if (paymentMethod === PaymentMethod.BALANCE) {
            return EndPoint.BALANCE;
        } else if (
            [PaymentMethod.DANA, PaymentMethod.OVO, PaymentMethod.GOPAY, PaymentMethod.SHOPEEPAY].includes(paymentMethod)
        ) {
            return EndPoint.EWALLET;
        } else if (paymentMethod === PaymentMethod.QRIS) {
            return EndPoint.QRIS;
        } else if (paymentMethod === PaymentMethod.BALANCEV2) {
            return EndPoint.BALANCEV2
        }
        throw new Error(`Unsupported payment method: ${paymentMethod}`);
    },
};

const Body = {
    balance(accessToken, timestamp, items, totalAmount, tokenPayment, paymentFor = "BUY_PACKAGE") {
        const body = {
            lang: "en",
            is_enterprise: false,
            access_token: accessToken,
            activated_autobuy_code: "",
            additional_data: {
                akrab_m2m_group_id: "false",
                balance_type: "PREPAID_BALANCE",
                benefit_type: "",
                cashtag: "",
                combo_details: [],
                discount_promo: 0,
                discount_recurring: 0,
                has_bonus: false,
                is_akrab_m2m: false,
                is_family_plan: false,
                is_spend_limit: false,
                is_spend_limit_temporary: false,
                is_switch_plan: false,
                migration_type: "",
                mission_id: "",
                original_price: 0,
                quota_bonus: 0,
                spend_limit_amount: 0,
                tax: 0,
            },
            akrab_members: [],
            akrab_parent_alias: "",
            authentication_id: "",
            autobuy_threshold_setting: {
                label: "",
                value: 0,
                type: "",
            },
            can_trigger_rating: false,
            cc_payment_type: "",
            coupon: "",
            encrypted_authentication_id: encryptPaymentToken("", timestamp),
            encrypted_payment_token: encryptPaymentToken("", timestamp),
            ewallet_promo_id: "",
            fingerprint: "",
            is_myxl_wallet: false,
            is_use_point: false,
            is_using_autobuy: false,
            items: items,
            members: [],
            payment_for: paymentFor,
            payment_method: "BALANCE",
            payment_token: "",
            pin: "",
            points_gained: 0,
            referral_unique_code: "",
            stage_token: "",
            timestamp: timestamp,
            token: "",
            token_confirmation: "",
            token_payment: tokenPayment,
            topup_number: "",
            total_amount: totalAmount.reduce((a, b) => a + b, 0),
            total_discount: 0,
            total_fee: 0,
            wallet_number: "",
            with_upsell: false
        };
        return xlapi.JsonBody.encrypt(body);
    },

    ewallet(accessToken, timestamp, items, totalAmount, tokenPayment, paymentMethod, walletNumber, paymentFor = "BUY_PACKAGE") {
        const body = {
            lang: "en",
            is_enterprise: false,
            access_token: accessToken,
            additional_data: {
                benefit_type: "",
                cashtag: "",
                combo_details: [],
                discount_promo: 0,
                discount_recurring: 0,
                has_bonus: false,
                is_family_plan: false,
                is_spend_limit: false,
                is_spend_limit_temporary: false,
                is_switch_plan: false,
                migration_type: "",
                original_price: 0,
                quota_bonus: 0,
                spend_limit_amount: 0,
                tax: 0,
            },
            akrab: {
                akrab_members: [],
                akrab_parent_alias: "",
                members: [],
            },
            autobuy: {
                activated_autobuy_code: "",
                autobuy_threshold_setting: {
                    label: "",
                    value: 0,
                    type: "",
                },
                is_using_autobuy: false,
            },
            can_trigger_rating: false,
            cc_payment_type: "",
            coupon: "",
            is_myxl_wallet: false,
            is_use_point: false,
            items: items,
            payment_for: paymentFor,
            payment_method: paymentMethod,
            timestamp: timestamp,
            verification_token: tokenPayment,
            topup_number: "",
            total_amount: totalAmount.reduce((a, b) => a + b, 0),
            total_discount: 0,
            total_fee: 0
        };

        if (walletNumber) {
            body.wallet_number = walletNumber;
        }

        return xlapi.JsonBody.encrypt(body);
    },

    balancev2(accessToken, timestamp, items, totalAmount, tokenPayment, paymentFor = "BUY_PACKAGE") {
        const body = {
            lang: "en",
            is_enterprise: false,
            access_token: accessToken,
            activated_autobuy_code: "",
            additional_data: {
                akrab_m2m_group_id: "false",
                balance_type: "PREPAID_BALANCE",
                benefit_type: "",
                cashtag: "",
                combo_details: [
                    {
                        "payment_method": "BALANCE",
                        "amount": totalAmount.reduce((a, b) => a + b, 0)
                    }
                ],
                discount_promo: 0,
                discount_recurring: 0,
                has_bonus: false,
                is_akrab_m2m: false,
                is_family_plan: false,
                is_spend_limit: false,
                is_spend_limit_temporary: false,
                is_switch_plan: false,
                migration_type: "",
                mission_id: "",
                original_price: 0,
                quota_bonus: 0,
                spend_limit_amount: 0,
                tax: 0,
            },
            akrab_members: [],
            akrab_parent_alias: "",
            authentication_id: "",
            autobuy_threshold_setting: {
                label: "",
                value: 0,
                type: "",
            },
            can_trigger_rating: false,
            cc_payment_type: "",
            coupon: "",
            encrypted_authentication_id: tokenPayment,
            encrypted_payment_token: tokenPayment,
            ewallet_promo_id: "",
            fingerprint: "",
            is_myxl_wallet: false,
            is_use_point: false,
            is_using_autobuy: false,
            items: items,
            members: [],
            payment_for: paymentFor,
            payment_method: "BALANCE",
            payment_token: "",
            pin: "",
            points_gained: 0,
            referral_unique_code: "",
            stage_token: "",
            timestamp: timestamp,
            token: "",
            token_confirmation: "",
            token_payment: tokenPayment,
            topup_number: "",
            total_amount: totalAmount.reduce((a, b) => a + b, 0),
            total_discount: 0,
            total_fee: 0,
            wallet_number: "",
            with_upsell: false
        };
        
        return xlapi.JsonBody.encrypt(body);
    },
};



module.exports = {
    PaymentMethod,
    PaymentMethodEwallet,
    EndPoint,
    Body,
};
