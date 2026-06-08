import { Resend } from "resend";
import { ENV } from "./env";

// Lazy client — retorna null quando a chave não está configurada (graceful degradation)
function getResend(): Resend | null {
  if (!ENV.resendApiKey) {
    console.warn("[Email] RESEND_API_KEY não configurada — e-mails desativados.");
    return null;
  }
  return new Resend(ENV.resendApiKey);
}

const FROM = () => ENV.resendFrom;

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
  const resend = getResend();
  if (!resend) return false; // silencioso quando não configurado
  const { data, error } = await resend.emails.send({
    from: FROM(),
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

// ─── E-mail de boas-vindas ────────────────────────────────────────────────────

export interface WelcomeEmailData {
  to: string;
  name: string;
  department?: string | null;
  position?: string | null;
  systemUrl?: string;
}

function buildWelcomeHtml(data: WelcomeEmailData): string {
  const { name, department, position, systemUrl = "https://www.dalgest.sbs" } = data;
  const firstName = name.split(" ")[0];
  const postoDisplay = position ? `${position} ` : "";
  const deptDisplay = department
    ? `<p style="margin:0 0 4px;color:#64748b;font-size:13px;">${department}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Acesso ao Sistema de Horas Extras — DAL/CBMPB</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <tr>
            <td style="background:#0f172a;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <p style="margin:0 0 8px;color:#94a3b8;font-size:11px;letter-spacing:2px;text-transform:uppercase;">Corpo de Bombeiros Militar da Paraíba</p>
              <h1 style="margin:0;color:#f8fafc;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Sistema de Horas Extras</h1>
              <p style="margin:8px 0 0;color:#cbd5e1;font-size:13px;">Diretoria de Apoio Logístico — DAL/CBMPB</p>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:40px;">
              <p style="margin:0 0 24px;color:#0f172a;font-size:16px;font-weight:600;">Olá, ${postoDisplay}${firstName}!</p>
              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.7;">Seu cadastro no <strong>Sistema de Cadastro de Horas Extras da DAL/CBMPB</strong> foi realizado com sucesso. Utilize as credenciais abaixo para realizar seu primeiro acesso.</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin:0 0 28px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 16px;color:#0f172a;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">🔐 Suas Credenciais de Acesso</p>
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr><td style="padding:10px 0;border-bottom:1px solid #e2e8f0;">
                        <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">E-mail</p>
                        <p style="margin:4px 0 0;color:#0f172a;font-size:14px;font-weight:500;">${data.to}</p>
                      </td></tr>
                      <tr><td style="padding:10px 0;">
                        <p style="margin:0;color:#64748b;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Senha Temporária</p>
                        <p style="margin:4px 0 0;font-size:20px;font-weight:700;letter-spacing:4px;color:#0f172a;font-family:monospace;">20262026</p>
                      </td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${(department || position) ? `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:0 0 28px;"><tr><td style="padding:20px 24px;"><p style="margin:0 0 10px;color:#15803d;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">👤 Seu Perfil</p><p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:600;">${name}</p>${deptDisplay}${position ? `<p style="margin:0;color:#64748b;font-size:13px;">${position}</p>` : ""}</td></tr></table>` : ""}
              <p style="margin:0 0 16px;color:#0f172a;font-size:14px;font-weight:700;">📋 Como realizar o primeiro acesso:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr><td style="padding:0 0 14px;"><table cellpadding="0" cellspacing="0"><tr><td valign="top" style="width:32px;"><div style="width:26px;height:26px;background:#0f172a;border-radius:50%;text-align:center;line-height:26px;color:#f8fafc;font-size:12px;font-weight:700;">1</div></td><td style="padding-left:12px;"><p style="margin:0 0 2px;color:#0f172a;font-size:13px;font-weight:600;">Acesse o sistema</p><p style="margin:0;color:#475569;font-size:13px;line-height:1.5;">Clique no botão abaixo ou cole o endereço <strong>${systemUrl}</strong> no navegador.</p></td></tr></table></td></tr>
                <tr><td style="padding:0 0 14px;"><table cellpadding="0" cellspacing="0"><tr><td valign="top" style="width:32px;"><div style="width:26px;height:26px;background:#0f172a;border-radius:50%;text-align:center;line-height:26px;color:#f8fafc;font-size:12px;font-weight:700;">2</div></td><td style="padding-left:12px;"><p style="margin:0 0 2px;color:#0f172a;font-size:13px;font-weight:600;">Faça login</p><p style="margin:0;color:#475569;font-size:13px;line-height:1.5;">Informe seu e-mail (<strong>${data.to}</strong>) e a senha temporária <strong>20262026</strong>.</p></td></tr></table></td></tr>
                <tr><td style="padding:0 0 14px;"><table cellpadding="0" cellspacing="0"><tr><td valign="top" style="width:32px;"><div style="width:26px;height:26px;background:#0f172a;border-radius:50%;text-align:center;line-height:26px;color:#f8fafc;font-size:12px;font-weight:700;">3</div></td><td style="padding-left:12px;"><p style="margin:0 0 2px;color:#0f172a;font-size:13px;font-weight:600;">Troque a senha</p><p style="margin:0;color:#475569;font-size:13px;line-height:1.5;">O sistema solicitará automaticamente a criação de uma senha pessoal. Escolha uma senha segura e guarde-a.</p></td></tr></table></td></tr>
                <tr><td style="padding:0 0 14px;"><table cellpadding="0" cellspacing="0"><tr><td valign="top" style="width:32px;"><div style="width:26px;height:26px;background:#0f172a;border-radius:50%;text-align:center;line-height:26px;color:#f8fafc;font-size:12px;font-weight:700;">4</div></td><td style="padding-left:12px;"><p style="margin:0 0 2px;color:#0f172a;font-size:13px;font-weight:600;">Pronto!</p><p style="margin:0;color:#475569;font-size:13px;line-height:1.5;">Você será redirecionado ao Dashboard e poderá começar a registrar suas escalas.</p></td></tr></table></td></tr>
              </table>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr><td align="center"><a href="${systemUrl}" style="display:inline-block;background:#0f172a;color:#f8fafc;text-decoration:none;font-size:14px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.3px;">Acessar o Sistema →</a></td></tr></table>
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;margin:0 0 8px;"><tr><td style="padding:16px 20px;"><p style="margin:0;color:#9a3412;font-size:13px;line-height:1.6;">⚠️ <strong>Atenção:</strong> Não compartilhe sua senha com terceiros. O acesso é vinculado exclusivamente ao seu e-mail cadastrado. Em caso de dificuldades, entre em contato: <a href="mailto:admin@cbmpb.pb.gov.br" style="color:#9a3412;">admin@cbmpb.pb.gov.br</a></p></td></tr></table>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;border-radius:0 0 12px 12px;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;">Administração do Sistema de Horas Extras<br/>Diretoria de Apoio Logístico — DAL/CBMPB<br/><a href="mailto:admin@cbmpb.pb.gov.br" style="color:#64748b;">admin@cbmpb.pb.gov.br</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildWelcomeText(data: WelcomeEmailData): string {
  const { name, to, department, position, systemUrl = "https://www.dalgest.sbs" } = data;
  return `Olá, ${name}!\n\nSeu cadastro no Sistema de Cadastro de Horas Extras da DAL/CBMPB foi realizado.\n\nCREDENCIAIS DE ACESSO\n─────────────────────\nE-mail:           ${to}\nSenha temporária: 20262026\n\n${department ? `Setor: ${department}\n` : ""}${position ? `Posto/Cargo: ${position}\n` : ""}\nPRIMEIRO ACESSO\n───────────────\n1. Acesse: ${systemUrl}\n2. Informe seu e-mail e a senha temporária 20262026\n3. O sistema solicitará a criação de uma senha pessoal\n4. Pronto — você estará no Dashboard\n\n⚠ Não compartilhe sua senha. Dúvidas: admin@cbmpb.pb.gov.br\n\nAdministração — DAL/CBMPB`;
}

/**
 * Envia e-mail de boas-vindas com credenciais de acesso ao novo usuário.
 * Silencioso quando RESEND_API_KEY não está configurada.
 */
export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  try {
    const { error } = await resend.emails.send({
      from: FROM(),
      to: data.to,
      subject: "🔐 Acesso ao Sistema de Horas Extras — DAL/CBMPB",
      html: buildWelcomeHtml(data),
      text: buildWelcomeText(data),
    });

    if (error) {
      console.error("[Email] Falha ao enviar e-mail de boas-vindas:", error);
    } else {
      console.log(`[Email] E-mail de boas-vindas enviado para ${data.to}`);
    }
  } catch (err) {
    // Nunca deixar erro de e-mail derrubar o cadastro
    console.error("[Email] Erro inesperado no envio de boas-vindas:", err);
  }
}
