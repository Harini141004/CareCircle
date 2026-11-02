import nodemailer from "nodemailer";

type MailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type MailResult = { ok: true } | { ok: false; error: string };

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: process.env.SMTP_SECURE !== "false", // true for port 465, set "false" for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

// Sends one email. Never throws: a failed email must not break the request that triggered it.
// EMAIL_PROVIDER = "console" (default, prints to the terminal) or "smtp" (Gmail).
export async function sendEmail({ to, subject, text, html }: MailInput): Promise<MailResult> {
  const provider = process.env.EMAIL_PROVIDER ?? "console";

  if (provider === "console") {
    console.log(
      `\n--- EMAIL (console mode, not sent) ---\nTo: ${to}\nSubject: ${subject}\n\n${text}\n--------------------------------------\n`
    );
    return { ok: true };
  }

  if (provider === "smtp") {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      return { ok: false, error: "SMTP_USER or SMTP_PASS is missing in .env.local" };
    }
    try {
      await getTransporter().sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to,
        subject,
        text,
        html,
      });
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[email] SMTP send failed:", message);
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: `Unknown EMAIL_PROVIDER: ${provider}` };
}