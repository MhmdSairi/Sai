// controllers/quota_details.js
const MyXL = require("../services/myxl");

module.exports = async function quotaDetails(req, res) {
    try {
        const { phoneNumber, subsType, refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'refreshToken is required' });
        }

        const myxl = await MyXL.init(phoneNumber || "62817xxxx", {
            subsType: subsType || "PREPAID",
            refreshToken
        });

        const quota = await myxl.getQuotaDetails();
        res.json(quota);
    } catch (error) {
        console.error("❌ Failed to get quota:", error);
        
        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
        } catch {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
};
