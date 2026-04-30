// controllers/package_details.js
const MyXL = require("../services/myxl");

module.exports = async function packageDetails(req, res) {
    try {
        const { phoneNumber, subsType, packageCode, refreshToken } = req.body;

        // ✅ Validasi semua field wajib
        if (!refreshToken || !packageCode) {
            return res.status(400).json({
                error: 'refreshToken, and packageCode are required'
            });
        }

        // ✅ Inisialisasi sesi MyXL
        const myxl = await MyXL.init(phoneNumber || "62817xxxx", {
            subsType: subsType || "PREPAID",
            refreshToken
        });

        // ✅ Ambil detail paket
        const result = await myxl.getPackageDetails(packageCode);
        res.json(result);
    } catch (error) {
        console.error("❌ Failed to get package details:", error);
        
        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
        } catch {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
};
