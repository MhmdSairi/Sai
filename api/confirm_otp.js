// controllers/confirmOtp.js
const MyXL = require("../services/myxl");

module.exports = async function confirmOtp(req, res) {
    try {
        const { phoneNumber, subsType, code } = req.body;

        if (!phoneNumber || !code) {
            return res.status(400).json({ error: 'phoneNumber and code are required' });
        }

        const myxl = await MyXL.init(phoneNumber, {
            subsType: subsType || "PREPAID"
        });

        const otpConfirmation = await myxl.confirmOtp(code);
        res.json(otpConfirmation);
    } catch (error) {
        console.error("OTP Confirmation Failed:", error);
        
        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
        } catch {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
};
