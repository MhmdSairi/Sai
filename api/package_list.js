// controllers/package_details.js
const MyXL = require("../services/myxl");

module.exports = async function packageList(req, res) {
    try {
        const { phoneNumber, subsType, isEnterprise, migrationType, familyCode, refreshToken } = req.body;

        // ✅ Validasi: Semua field wajib
        if (!refreshToken || !familyCode) {
            return res.status(400).json({
                error: 'Fields refreshToken, and familyCode are required'
            });
        }

        // ✅ Inisialisasi sesi MyXL
        const myxl = await MyXL.init(phoneNumber || "62817xxxx", {
            subsType: subsType || "PREPAID",
            refreshToken
        });

        // ✅ Ambil daftar paket berdasarkan familyCode
        const result = await myxl.getPackageList(familyCode,
            isEnterprise || false,
            migrationType || "NONE"
        );

        res.json(result);
    } catch (error) {
        console.error("❌ Failed to get package list:", error);
        
        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
        } catch {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
};
