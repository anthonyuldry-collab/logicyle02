/**
 * Email transactionnel optionnel (Resend).
 * Activer : secret RESEND_API_KEY + RESEND_FROM (ex. Factures Rovik <contact@logicycle.app>)
 * Sans clé : no-op loggé (non bloquant).
 */

async function sendTransactionalEmail({ to, subject, html, text, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Rovik <contact@logicycle.app>';
  if (!apiKey) {
    return { sent: false, reason: 'resend_not_configured' };
  }
  if (!to) {
    return { sent: false, reason: 'missing_recipient' };
  }

  const payload = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html: html || undefined,
    text: text || undefined,
  };

  if (attachments?.length) {
    payload.attachments = attachments.map((a) => ({
      filename: a.filename,
      content: Buffer.isBuffer(a.content)
        ? a.content.toString('base64')
        : Buffer.from(a.content).toString('base64'),
    }));
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    const err = new Error(`Resend ${res.status}: ${body.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  return { sent: true, id: data.id };
}

function missionInvoiceEmailHtml({ title, intro, rows }) {
  const rowHtml = (rows || [])
    .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#555">${k}</td><td style="padding:4px 8px"><strong>${v}</strong></td></tr>`)
    .join('');
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;color:#111">
  <h2>${title}</h2>
  <p>${intro}</p>
  <table style="border-collapse:collapse">${rowHtml}</table>
  <p style="margin-top:24px;font-size:12px;color:#666">Rovik — conservez la pièce jointe pour votre comptabilité.</p>
  </body></html>`;
}

module.exports = {
  sendTransactionalEmail,
  missionInvoiceEmailHtml,
};
