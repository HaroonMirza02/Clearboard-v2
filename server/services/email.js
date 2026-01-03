const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_PORT == 465,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Send an invitation email to a user.
 * @param {string|string[]} to - Recipient email(s)
 * @param {Object} details - Details for the email
 * @param {string} details.companyName - Name of the organization
 * @param {string} details.adminName - Name of the person inviting
 * @param {string} details.customMessage - Optional custom message
 */
const sendInvitation = async (to, { companyName, adminName, customMessage }) => {
    const recipients = Array.isArray(to) ? to : [to];

    const mailOptions = {
        from: process.env.EMAIL_FROM || '"ClearBoard" <noreply@clearboard.com>',
        to: recipients.join(', '),
        subject: `Join ${companyName} on ClearBoard`,
        html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
        <h2 style="color: #2563eb;">You're Invited to Join ClearBoard</h2>
        <p>Hello,</p>
        <p><strong>${adminName}</strong> has invited you to join their organization, <strong>${companyName}</strong>, on ClearBoard.</p>
        ${customMessage ? `<div style="background: #f8fafc; padding: 15px; border-left: 4px solid #3b82f6; margin: 20px 0;">"${customMessage}"</div>` : ''}
        <p>ClearBoard helps teams collaborate securely with role-based access and file lifecycle management.</p>
        <div style="margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/signup" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
        </div>
        <p style="color: #64748b; font-size: 0.875rem;">If you have any questions, please contact your administrator.</p>
      </div>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Invitation sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending invitation:', error);
        throw error;
    }
};

module.exports = {
    sendInvitation,
};
