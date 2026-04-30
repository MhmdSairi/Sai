// controllers/package_details.js
const MyXL = require("../services/myxl");

module.exports = async function pendingDetail(req, res) {
    try {
        const { phoneNumber, subsType, transactionCode, refreshToken } = req.body;

        // ✅ Validasi semua field wajib
        if (!refreshToken || !transactionCode) {
            return res.status(400).json({
                error: 'refreshToken, and transactionCode are required'
            });
        }

        // ✅ Inisialisasi sesi MyXL
        const myxl = await MyXL.init(phoneNumber || "62817xxxx", {
            subsType: subsType || "PREPAID",
            refreshToken
        });

        // ✅ Ambil detail paket
        const result = await myxl.paymentPendingDetail(transactionCode);
        res.json(result);
    } catch (error) {
        console.error("❌ Failed to get payment pending detail:", error);
        
        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
        } catch {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
};
