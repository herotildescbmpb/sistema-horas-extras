import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || "noreply@dalgest.sbs";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends a transactional e-mail via Resend.
 * Returns true on success, throws on failure.
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    console.error("[Email] Failed to send email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  console.log("[Email] Sent successfully:", data?.id);
  return true;
}

/**
 * Sends a password-reset e-mail with the recovery link.
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<boolean> {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Recuperação de Senha</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:#1a1a2e;padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:700;color:#f59e0b;letter-spacing:-0.5px;">HorasExtra</span>
              <span style="display:block;font-size:12px;color:#94a3b8;margin-top:4px;">Sistema de Gestão — DAL/CBMPB</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#111827;">Olá, <strong>${name}</strong>,</p>
              <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
                Recebemos uma solicitação para redefinir a senha da sua conta no sistema HorasExtra.
                Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
              </p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background:#f59e0b;border-radius:6px;">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#1a1a2e;text-decoration:none;">
                      Redefinir minha senha
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 12px;font-size:13px;color:#6b7280;line-height:1.5;">
                Se o botão não funcionar, copie e cole o link abaixo no seu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;word-break:break-all;">
                <a href="${resetUrl}" style="color:#f59e0b;">${resetUrl}</a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 20px;" />
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.5;">
                Se você não solicitou a redefinição de senha, ignore este e-mail. Sua senha permanecerá a mesma.
                Por segurança, nunca compartilhe este link com ninguém.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                DAL/CBMPB — Divisão de Apoio Logístico · Corpo de Bombeiros Militar da Paraíba
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendEmail({ to, subject: "Recuperação de senha — HorasExtra DAL/CBMPB", html });
}
