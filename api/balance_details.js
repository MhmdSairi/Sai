// controllers/balance_details.js
const MyXL = require("../services/myxl");

module.exports = async function balanceDetails(req, res) {
    try {
        const { phoneNumber, subsType, refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'refreshToken is required' });
        }

        const myxl = await MyXL.init(phoneNumber || "62817xxxx", {
            subsType: subsType || "PREPAID",
            refreshToken
        });

        const balance = await myxl.getBalances();
        res.json(balance);
    } catch (error) {
        console.error("❌ Failed to get balance:", error);
        
        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
        } catch {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
};
