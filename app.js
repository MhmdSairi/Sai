const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const encryptHandler = require('./lib/encrypt');
const decryptHandler = require('./lib/decrypt');
const defaultSignatureHandler = require('./lib/default_signature');
const settlementSignatureHandler = require('./lib/settlement_signature');
const settlementSignV2Handler = require('./lib/settlement_signv2');

const app = express();
const cors = require('cors');

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, 'public')));


// === Konfigurasi Swagger ===
const swaggerDocument = YAML.load('./swagger.yaml');
const swaggerSignV2Document = YAML.load('./swagger_signv2.yaml');

const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "API Docs - Enkripsi & Signature"
};

const swaggerOptionsV2 = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "API Docs - Settlement Signature V2"
};

const apiDocsPath = "A1QVdtAFgLWNNevs";

// Generate HTML statis untuk tiap dokumentasi
const swaggerHtmlV1 = swaggerUi.generateHTML(swaggerDocument, swaggerOptions);
const swaggerHtmlV2 = swaggerUi.generateHTML(swaggerSignV2Document, swaggerOptionsV2);

// Serve static files for Swagger UI
app.use(`/${apiDocsPath}-api-docs`, swaggerUi.serveFiles(swaggerDocument, swaggerOptions));
app.get(`/${apiDocsPath}-api-docs`, (req, res) => {
  res.send(swaggerHtmlV1);
});

app.use(`/${apiDocsPath}-api-docs-signv2`, swaggerUi.serveFiles(swaggerSignV2Document, swaggerOptionsV2));
app.get(`/${apiDocsPath}-api-docs-signv2`, (req, res) => {
  res.send(swaggerHtmlV2);
});

// === API Routes ===
const apiPath = 'natwillme-L4rguLQqA4js0G1X';

app.post(`/${apiPath}/encrypt`, encryptHandler);
app.post(`/${apiPath}/decrypt`, decryptHandler);
app.post(`/${apiPath}/default-signature`, defaultSignatureHandler);
app.post(`/${apiPath}/settlement-signature`, settlementSignatureHandler);
app.post(`/${apiPath}/settlement-signv2`, settlementSignV2Handler);

const reqOtpHandler = require("./api/req_otp");
const confirmOtpHandler = require("./api/confirm_otp");
const quotaDetailsHandler = require("./api/quota_details");
const balanceDetailsHandler = require("./api/balance_details");
const packageDetailsHandler = require("./api/package_details");
const packageListHandler = require("./api/package_list");
const pendingDetailHandler = require("./api/pending_detail");
const dorHandler = require("./api/dor");
const dorHandlerV2 = require("./api/dorv2");
const dorHandlerV3 = require("./api/dorv3");
const dorHandlerV4 = require("./api/dorv4");
const dorHandlerV5 = require("./api/dorv5");

app.post('/api/req-otp', reqOtpHandler);
app.post('/api/confirm-otp', confirmOtpHandler);
app.post('/api/quota-details', quotaDetailsHandler);
app.post('/api/balance-details', balanceDetailsHandler);
app.post('/api/package-details', packageDetailsHandler);
app.post('/api/package-list', packageListHandler);
app.post('/api/pending-detail', pendingDetailHandler);
app.post('/api/dor', dorHandler);
app.post('/api/dorv2', dorHandlerV2);
app.post('/api/dorv3', dorHandlerV3);
app.post('/api/dorv4', dorHandlerV4);
app.post('/api/dorv5', dorHandlerV5);

app.get('/old-ui', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
    // res.send('404 Nyasar jalan buntu');
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
    // res.send('404 Nyasar jalan buntu');
});

app.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
    console.log(`📘 Swagger Utama: /${apiDocsPath}-api-docs`);
    console.log(`📙 Swagger V2: /${apiDocsPath}-api-docs-signv2`);
});
