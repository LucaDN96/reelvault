export async function sendCollectionInvite({ to, collectionName, inviterEmail, link }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'ReelVault <noreply@reelvault.app>',
      to:   [to],
      subject: `${inviterEmail} invited you to "${collectionName}" on ReelVault`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #534AB7; margin-bottom: 8px;">ReelVault</h2>
          <p style="color: #555; margin-bottom: 4px;">
            <strong>${inviterEmail}</strong> invited you to join the collection
            <strong>"${collectionName}"</strong>.
          </p>
          <a href="${link}" style="display:inline-block;margin-top:20px;background:#534AB7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Accept Invite
          </a>
          <p style="color: #888; font-size: 13px; margin-top: 20px;">
            This invite expires in 7 days.
          </p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend error ${res.status}: ${err.message || res.statusText}`);
  }
}

export async function sendVerificationCode(email, code) {
  const expiry = process.env.BOT_VERIFICATION_EXPIRY_MINUTES || 10;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || 'ReelVault <noreply@reelvault.app>',
      to: [email],
      subject: 'Your ReelVault verification code',
      text: `Your ReelVault Telegram verification code is: ${code}\n\nThis code expires in ${expiry} minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #534AB7; margin-bottom: 8px;">ReelVault</h2>
          <p style="color: #555; margin-bottom: 24px;">Your Telegram verification code:</p>
          <div style="background: #f4f3ff; border: 2px solid #534AB7; border-radius: 12px; padding: 24px; text-align: center;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #534AB7;">${code}</span>
          </div>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            Expires in ${expiry} minutes.
            If you didn't request this, ignore this email.
          </p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Resend API error ${res.status}: ${err.message || res.statusText}`);
  }
}
