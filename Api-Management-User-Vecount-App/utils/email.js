const nodemailer = require("nodemailer");

const sendOTP = async (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST, // Host SMTP
    port: process.env.SMTP_PORT, // Port SMTP
    auth: {
      user: process.env.SMTP_USER, // Username dari SMTP
      pass: process.env.SMTP_PASS, // Password dari Mailtrap
    },
  });

  await transporter.sendMail({
    from: `"soultanamirulmukminin@gmail.com"`, // Alamat pengirim
    to: email, // Email tujuan
    subject: "Account Activation OTP", // Subjek email
    text: `Your OTP is: ${otp}`, // Isi email berupa teks
  });
};

module.exports = sendOTP;
