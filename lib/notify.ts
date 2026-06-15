// Pluggable email sender. Uses Resend if RESEND_API_KEY is set; otherwise logs
// to the console so the flow is fully testable locally without credentials.

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || "alerts@findmytrainer.local";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(
      `[email:dev] to=${msg.to} subject="${msg.subject}"\n${msg.text}`
    );
    return true;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: msg.to,
        subject: msg.subject,
        text: msg.text,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend error", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] send failed", e);
    return false;
  }
}
