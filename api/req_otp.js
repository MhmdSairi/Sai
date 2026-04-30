// requestOtp.js
const MyXL = require("../services/myxl");

module.exports = async function requestOtp(req, res) {
    try {
        const { phoneNumber, subsType } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ error: 'phoneNumber are required' });
        }

        const myxl = await MyXL.init(phoneNumber, {
            subsType: subsType || "PREPAID"
        });

        const otpResponse = await myxl.requestOtp(phoneNumber, subsType);
        res.json(otpResponse);
    } catch (error) {
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
