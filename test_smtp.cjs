require('dotenv').config();
const nodemailer = require('nodemailer');

async function testSMTP() {
  const smtpPort = parseInt(process.env.SMTP_PORT, 10) || 587;
  const smtpSecure = smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  try {
    const info = await transporter.verify();
    console.log("SMTP Connection verified:", info);
    
    // Optional: Try sending a test email
    const mailOptions = {
        from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
        to: process.env.SMTP_USER,
        subject: 'Test Email',
        text: 'This is a test email to verify SMTP configuration.'
    };
    
    const sendInfo = await transporter.sendMail(mailOptions);
    console.log("Test email sent:", sendInfo.messageId);
    
  } catch (error) {
    console.error("SMTP Error:", error);
  }
}

testSMTP();
