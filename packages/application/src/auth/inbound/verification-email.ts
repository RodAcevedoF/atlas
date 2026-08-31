import type { EmailMessage } from "../outbound/email.ts";

export function buildVerificationEmail(webAppUrl: string, token: string, to: string): EmailMessage {
  const verificationUrl = new URL("/verify-email", webAppUrl);
  verificationUrl.searchParams.set("token", token);
  const link = verificationUrl.toString();

  return {
    to,
    subject: "Verify your email to start exploring Atlas",
    html: verificationEmailHtml(link),
    text: verificationEmailText(link),
  };
}

function verificationEmailText(link: string): string {
  return [
    "ATLAS",
    "",
    "Your map is waiting.",
    "",
    "Confirm your email to start a new inquiry. Atlas will research your question, trace the claims, and place them where they are happening.",
    "",
    "Verify your email:",
    link,
    "",
    "This one-time link expires in 24 hours.",
    "",
    "If you did not create an Atlas account, you can safely ignore this email.",
    "",
    "Atlas — Ask one question. Watch the world answer.",
  ].join("\n");
}

function verificationEmailHtml(link: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>Verify your Atlas email</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0a1330;color:#eaefff;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
      Confirm your email to start asking Atlas and put your next answer on the map.
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0a1330" style="width:100%;background-color:#0a1330;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;">
            <tr>
              <td style="padding:0 4px 18px;">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td width="32" height="32" align="center" valign="middle" style="width:32px;height:32px;border:1px solid #eaefff;border-radius:50%;font-size:17px;line-height:32px;color:#4fe3c1;">●</td>
                    <td style="padding-left:12px;font-size:21px;line-height:28px;font-weight:700;letter-spacing:-0.5px;color:#eaefff;">Atlas</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#0c1638" style="overflow:hidden;border:1px solid #283960;border-radius:22px;background-color:#0c1638;box-shadow:0 24px 70px rgba(2,6,24,0.45);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td height="4" bgcolor="#4fe3c1" style="height:4px;background-color:#4fe3c1;font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:46px 48px 22px;">
                      <p style="margin:0 0 16px;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#4fe3c1;">Email verification</p>
                      <h1 style="margin:0 0 18px;font-size:36px;line-height:42px;font-weight:700;letter-spacing:-1.2px;color:#eaefff;">Your map is waiting.</h1>
                      <p style="margin:0;font-size:16px;line-height:26px;color:#aeb9da;">Confirm your email to start a new inquiry. Atlas will research your question, trace the claims, and place them where they are happening.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 48px 30px;">
                      <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                        <tr>
                          <td align="center" bgcolor="#4fe3c1" style="border-radius:999px;background-color:#4fe3c1;">
                            <a href="${link}" style="display:inline-block;padding:15px 26px;font-size:15px;line-height:20px;font-weight:700;text-decoration:none;color:#05081a;">Verify email&nbsp;&nbsp;→</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 48px 42px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#101d42" style="width:100%;border:1px solid #24365e;border-radius:14px;background-color:#101d42;">
                        <tr>
                          <td style="padding:18px 20px;">
                            <p style="margin:0 0 8px;font-size:12px;line-height:18px;color:#8f9bc0;">This one-time link expires in 24 hours. If the button does not work, paste this address into your browser:</p>
                            <p style="margin:0;word-break:break-all;font-family:'Courier New',Courier,monospace;font-size:11px;line-height:18px;color:#8aa4ff;"><a href="${link}" style="color:#8aa4ff;text-decoration:underline;">${link}</a></p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top:1px solid #24365e;padding:22px 48px 26px;">
                      <p style="margin:0;font-size:12px;line-height:19px;color:#7f8caf;">If you did not create an Atlas account, you can safely ignore this email.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:20px 24px 0;font-family:'Courier New',Courier,monospace;font-size:10px;line-height:16px;letter-spacing:1px;text-transform:uppercase;color:#69779f;">Ask one question. Watch the world answer.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
