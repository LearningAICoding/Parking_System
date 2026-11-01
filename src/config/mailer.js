const nodemailer = require('nodemailer');
const env = require('./env');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.mail.host || '127.0.0.1',
      port: env.mail.port,
      secure: false,
      auth: env.mail.user ? {
        user: env.mail.user,
        pass: env.mail.password
      } : undefined
    });
  }
  return transporter;
}

async function sendPasswordResetEmail({ to, token }) {
  const resetUrl = `/reset-password/${token}`;
  if (!env.mail.host) return;

  await getTransporter().sendMail({
    from: env.mail.from,
    to,
    subject: 'Đặt lại mật khẩu tài khoản bãi đỗ xe',
    text: `Mở liên kết sau trong vòng 30 phút để đặt lại mật khẩu: ${resetUrl}`
  });
}

module.exports = { sendPasswordResetEmail };
