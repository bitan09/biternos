import nodemailer from "nodemailer";
import { env } from "../config/env";

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : null;

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!transporter) {
    // No SMTP configured (e.g. local dev) — log instead of failing the request.
    console.log(`[mail:dev] Password reset link for ${to}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: '"Bitarnos" <no-reply@bitarnos.app>',
    to,
    subject: "Reset your Bitarnos password",
    html: `
      <div style="font-family: sans-serif; background:#0D1117; color:#E6EDF3; padding:24px;">
        <h2 style="color:#4ADE80;">Bitarnos</h2>
        <p>We received a request to reset your password. This link expires in 1 hour.</p>
        <p><a href="${resetUrl}" style="color:#38BDF8;">Reset your password</a></p>
        <p style="color:#8B98A5; font-size:12px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
