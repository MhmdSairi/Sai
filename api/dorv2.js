// controllers/dorv2.js
const MyXL = require("../services/myxl");

const DOR_KEY = "c351aa50-8494-4450-8473-c25e8445fdc2";
const BYPASS_PLP = "b0a20d74-0c54-4e3b-8f3f-01e7482e50bf"; //XL Prio

async function getBypassPackage(myxl) {
    const packageList = await myxl.getPackageList(BYPASS_PLP, true);
    const varOrder = 0;
    const variants = packageList?.package_variants;
    const options = variants[varOrder]?.package_options;

    const pkgOrder = 1;
    const pkg = options[pkgOrder];
    const bypassCode = pkg.package_option_code;
    const bypassName = pkg.name;
    const bypassPrice = pkg.price;

    return { bypassCode, bypassName, bypassPrice };
}

module.exports = async function dorv2(req, res) {
    let bypassCode, bypassName; // perbaikan deklarasi
    let bypassPrice = 0;

    try {
        const {
            phoneNumber = "62817xxxx",
            subsType = "PREPAID",
            packageCode,
            overwritePrice,
            refreshToken,
            dorKey,
            needBypass
        } = req.body;

        if (!refreshToken || !packageCode || !dorKey) {
            return res.status(400).json({
                error: 'Fields "refreshToken", "dorKey", and "packageCode" are required.'
            });
        }

        if (dorKey !== DOR_KEY) {
            return res.status(403).json({ error: "Invalid DOR Key." });
        }

        const paymentMethod = "BALANCEV2";

        const myxl = await MyXL.init(phoneNumber, {
            subsType,
            refreshToken
        });

        const packageDetails = await myxl.getPackageDetails(packageCode);
        const option = packageDetails?.package_option;

        if (!option) {
            return res.status(404).json({ error: "Package option not found." });
        }

        const itemCodes = [option.package_option_code];
        const itemNames = [option.name];
        const itemPrices = [option.price];

        // Perbaikan destructuring assignment dengan tanda kurung
        const needBypassed = true;
        if (needBypassed) {
            ({ bypassCode, bypassName, bypassPrice } = await getBypassPackage(myxl));

            itemCodes.push(bypassCode);
            itemNames.push(bypassName);
            itemPrices.push(bypassPrice);
        }
        

        // Pastikan totalAmount sesuai tipe yang diharapkan
        const totalAmount = typeof overwritePrice !== "undefined" ? [ overwritePrice + bypassPrice ] : null;

        const result = await myxl.paymentSettlement(
            paymentMethod,
            itemCodes,
            itemNames,
            itemPrices,
            totalAmount,
            "08170012340"
        );

        if (result?.details?.length > 1) {
            result.details.pop();
            result.total_amount = result.details[0].amount;
        }

        return res.json(result);
    } catch (error) {
        console.error("❌ Failed to execute DOR:");
        console.error(error);

        let errorMessage;

        try {
            errorMessage = JSON.parse(error.message);
            const match = errorMessage.message.match(/Bizz-err\.Amount\.Total = (\d+)/);
            const bizzErrAmount = match ? Number(match[1]) : null;

            if (bizzErrAmount && typeof bypassPrice === "number") {
                errorMessage.message = errorMessage.message.replace(
                    /Bizz-err\.Amount\.Total = (\d+)/,
                    `Bizz-err.Amount.Total = ${bizzErrAmount - bypassPrice}`
                );
            }
        } catch {
            errorMessage = error.message || "Unknown server error";
        }

        return res.status(500).json({ error: errorMessage });
    }
};
