let whatsappClient = null;
let latestQrCodeData = null; // Base64 string of the QR code
let isClientReady = false;

let Client = null;
let LocalAuth = null;
let qrcode = null;

const loadWhatsAppDependencies = () => {
    if (Client && LocalAuth && qrcode) return true;

    try {
        const wa = require('whatsapp-web.js');
        Client = wa.Client;
        LocalAuth = wa.LocalAuth;
        qrcode = require('qrcode');
        return true;
    } catch (err) {
        console.warn('[WhatsApp Service] Heavy dependencies are unavailable. Service stays disabled:', err.message);
        return false;
    }
};

const initWhatsApp = () => {
    if (!loadWhatsAppDependencies()) {
        return;
    }

    whatsappClient = new Client({
        authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
        puppeteer: {
            executablePath: process.env.CHROME_BIN || '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--disable-software-rasterizer',
                '--no-zygote',
                '--disable-extensions'
            ],
        },
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        }
    });

    whatsappClient.on('qr', async (qr) => {
        console.log('[WhatsApp Service] QR Code Received. Needs Scan.');
        try {
            latestQrCodeData = await qrcode.toDataURL(qr);
        } catch (err) {
            console.error('[WhatsApp Service] QR generation error:', err);
        }
    });

    whatsappClient.on('ready', () => {
        console.log('[WhatsApp Service] Client is READY!');
        isClientReady = true;
        latestQrCodeData = null; // Clear QR code as it's no longer needed
    });

    whatsappClient.on('authenticated', () => {
        console.log('[WhatsApp Service] Authenticated successfully.');
    });

    whatsappClient.on('auth_failure', msg => {
        console.error('[WhatsApp Service] Authentication failure:', msg);
        isClientReady = false;
    });

    whatsappClient.on('disconnected', (reason) => {
        console.log('[WhatsApp Service] Client was disconnected:', reason);
        isClientReady = false;
        // Re-initialize client
        setTimeout(initWhatsApp, 5000);
    });

    whatsappClient.initialize().catch(err => {
        console.error('[WhatsApp Service] Initialization error:', err);
    });
};

const getQrCode = () => {
    return {
        isReady: isClientReady,
        qrCode: latestQrCodeData
    };
};

/**
 * Formats phone number to international format (e.g., 9665XXXXXXXX)
 */
const formatPhone = (phone) => {
    if (!phone) return null;
    let cleaned = phone.replace(/\D/g, '');
    // If Saudi number starts with 05, replace 0 with 966
    if (cleaned.startsWith('05')) {
        cleaned = '966' + cleaned.substring(1);
    }
    return cleaned;
};

/**
 * Sends a WhatsApp notification to the client.
 */
const sendTripPendingReviewWhatsApp = async (trip, clientPhone, project, company) => {
    if (!isClientReady || !whatsappClient) {
        console.log('[WhatsApp Service] Client not ready, skipping message.');
        return;
    }

    const formattedPhone = formatPhone(clientPhone);
    if (!formattedPhone) {
        console.log('[WhatsApp Service] Invalid or missing phone number.');
        return;
    }

    const tripUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/client/dashboard?highlight=${encodeURIComponent(trip.trip_id)}`;
    
    const message = `*GCM ERP System* 🚨\n\n` +
        `Dear ${company?.company_name || 'Client'},\n` +
        `A new trip is ready for your approval.\n\n` +
        `*Trip ID:* ${trip.trip_id}\n` +
        `*Project:* ${project?.project_name || 'N/A'}\n` +
        `*Date:* ${trip.date} at ${trip.time}\n` +
        `*Quantity:* ${trip.quantity} ${trip.unit}\n\n` +
        `Please review and approve the trip using the link below:\n` +
        `${tripUrl}\n\n` +
        `_This is an automated message. Please do not reply._`;

    try {
        const chatId = `${formattedPhone}@c.us`;
        await whatsappClient.sendMessage(chatId, message);
        console.log(`[WhatsApp Service] Message sent to ${formattedPhone}`);
    } catch (error) {
        console.error('[WhatsApp Service Error]', error);
    }
};

module.exports = {
    initWhatsApp,
    getQrCode,
    sendTripPendingReviewWhatsApp
};
