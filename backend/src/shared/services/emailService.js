const nodemailer = require('nodemailer');
require('dotenv').config();

// Create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Sends a notification email to the client when a trip is ready for review.
 * @param {Object} trip - The trip object
 * @param {string} clientEmail - The recipient email
 * @param {Object} project - The related project
 * @param {Object} company - The related company
 */
const sendTripPendingReviewEmail = async (trip, clientEmail, project, company) => {
    if (!clientEmail || !process.env.SMTP_USER) {
        console.log('[Email Service] Missing client email or SMTP config, skipping email.');
        return;
    }

    try {
        const tripUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/client/dashboard?highlight=${encodeURIComponent(trip.trip_id)}`;
        
        const mailOptions = {
            from: process.env.SMTP_FROM || `"GCM ERP" <${process.env.SMTP_USER}>`,
            to: clientEmail,
            subject: `[GCM] Trip Ready for Approval: ${trip.trip_id}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                    
                    <div style="background-color: #10b981; padding: 24px; text-align: center;">
                        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Trip Ready for Approval</h2>
                        <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 14px;">رحلة جاهزة للاعتماد</p>
                    </div>

                    <div style="padding: 32px 24px;">
                        <p style="font-size: 16px; color: #334155; margin-top: 0;">
                            Dear <strong>${company?.company_name || 'Valued Client'}</strong>,
                        </p>
                        <p style="font-size: 16px; color: #334155;">
                            A new trip has been completed by our driver and is now waiting for your final review and signature.
                            <br/><span dir="rtl" style="font-size: 14px; color: #64748b;">(تم الانتهاء من الرحلة الموضحة أدناه، وهي بانتظار مراجعتكم واعتمادكم النهائي)</span>
                        </p>

                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px; width: 40%;">Trip ID (رقم الرحلة):</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold;">${trip.trip_id}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e2e8f0;">
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Project (المشروع):</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold;">${project?.project_name || 'N/A'}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e2e8f0;">
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date (التاريخ):</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold;">${trip.date} at ${trip.time}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e2e8f0;">
                                    <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Quantity (الكمية):</td>
                                    <td style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: bold;">${trip.quantity} ${trip.unit}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="text-align: center; margin-top: 32px;">
                            <a href="${tripUrl}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
                                Review & Approve / مراجعة واعتماد
                            </a>
                        </div>
                    </div>

                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">
                            This is an automated message from GCM ERP System. Please do not reply.<br/>
                            هذه رسالة آلية من نظام GCM، نرجو عدم الرد.
                        </p>
                    </div>

                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('[Email Service] Email sent: %s', info.messageId);
    } catch (error) {
        console.error('[Email Service Error]', error);
    }
};

module.exports = {
    sendTripPendingReviewEmail
};
