// controllers/dor.js
const MyXL = require("../services/myxl");

module.exports = async function dor(req, res) {
    try {
        const { paymentMethod, phoneNumber, subsType, packageCode, overwritePrice, refreshToken } = req.body;

        // ✅ Validasi: Semua field wajib
        if (!refreshToken || !packageCode || !paymentMethod) {
            return res.status(400).json({
                error: 'Fields refreshToken, paymentMethod, and packageCode are required'
            });
        }

        const validMethods = ["BALANCE", "DANA", "GOPAY", "QRIS"];
        if (!validMethods.includes(paymentMethod)) {
            return res.status(400).json({
                error: `Invalid paymentMethod. Valid methods: ${validMethods.join(", ")}`
            });
        }

        // ✅ Inisialisasi sesi MyXL
        const myxl = await MyXL.init(phoneNumber || "62817xxxx", {
            subsType: subsType || "PREPAID",
            refreshToken
        });

        const packageDetails = await myxl.getPackageDetails(packageCode);
        const option = packageDetails?.package_option || {};
        const code = option?.package_option_code;
        const name = option?.name;
        const price = option?.price;

        const itemCodes = [ code ];
        const itemNames = [ name ];
        const itemPrices = [ price ];
        const totalAmount =  overwritePrice !== undefined ? [ overwritePrice ] : null

        // ✅ Ambil daftar paket berdasarkan familyCode
        const result = await myxl.paymentSettlement(
            paymentMethod,
            itemCodes,
            itemNames,
            itemPrices,
            totalAmount,
            "08170012340"
        );

        res.json(result);
    } catch (error) {
        console.error("❌ Failed to execute DOR:");
        console.error(error);

        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
        } catch {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
};
