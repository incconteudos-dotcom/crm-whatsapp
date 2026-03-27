/**
 * Email Integration via Brevo API v5
 * Sends transactional emails for invoices, quotes, and contracts
 * with professional HTML templates.
 */
import { BrevoClient } from "@getbrevo/brevo";

const BREVO_API_KEY = process.env.BREVO_API_KEY ?? "";
const FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? "noreply@patioestudioscrm.manus.space";
const FROM_NAME = process.env.BREVO_FROM_NAME ?? "Pátio Estúdio de Podcast";

function getClient() {
  return new BrevoClient({ apiKey: BREVO_API_KEY });
}

// ─── EMAIL WRAPPER ────────────────────────────────────────────────────────────

function buildEmailWrapper(title: string, preheader: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f7; color: #333; }
    .preheader { display: none; max-height: 0; overflow: hidden; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 24px 16px; }
    .card { background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
    .header p { color: rgba(255,255,255,0.85); font-size: 13px; margin-top: 6px; }
    .body { padding: 32px 40px; }
    .badge { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
    .badge-draft { background: #f3f4f6; color: #6b7280; }
    .badge-sent { background: #eff6ff; color: #3b82f6; }
    .badge-paid { background: #f0fdf4; color: #16a34a; }
    .badge-overdue { background: #fef2f2; color: #dc2626; }
    .badge-pending { background: #fffbeb; color: #d97706; }
    .badge-signed { background: #f0fdf4; color: #16a34a; }
    .badge-accepted { background: #f0fdf4; color: #16a34a; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
    .info-block { background: #f9fafb; border-radius: 8px; padding: 14px 16px; }
    .info-block .label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .info-block .value { font-size: 14px; font-weight: 600; color: #111827; }
    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 8px; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    table.items th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 8px 12px; text-align: left; border-bottom: 2px solid #f3f4f6; }
    table.items td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; }
    table.items td.right { text-align: right; }
    .totals { background: #f9fafb; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
    .totals-row { display: flex; justify-content: space-between; font-size: 14px; color: #6b7280; margin-bottom: 8px; }
    .totals-total { display: flex; justify-content: space-between; font-size: 18px; font-weight: 700; color: #111827; padding-top: 10px; border-top: 2px solid #e5e7eb; }
    .cta-button { display: block; text-align: center; background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 15px; font-weight: 600; margin: 24px 0; }
    .notes { background: #fffbeb; border-left: 3px solid #f59e0b; border-radius: 0 8px 8px 0; padding: 14px 16px; font-size: 13px; color: #92400e; margin-bottom: 20px; }
    .footer { padding: 20px 40px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>
  <span class="preheader">${preheader}</span>
  <div class="wrapper">
    <div class="card">
      ${bodyContent}
      <div class="footer">
        <p>Este email foi enviado por <strong>${FROM_NAME}</strong></p>
        <p style="margin-top:6px;">Em caso de dúvidas, entre em contato conosco.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ─── INVOICE EMAIL ─────────────────────────────────────────────────────────────

export function buildInvoiceEmail(params: {
  number: string;
  clientName: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  discount?: number | null;
  total: number;
  dueDate?: Date | null;
  notes?: string | null;
  status: string;
  paymentUrl?: string | null;
  companyName?: string;
}) {
  const statusLabel: Record<string, string> = {
    draft: "Rascunho", sent: "Enviada", paid: "Paga", overdue: "Vencida", cancelled: "Cancelada",
  };
  const dueDateStr = params.dueDate
    ? new Date(params.dueDate).toLocaleDateString("pt-BR")
    : "—";

  const itemsRows = params.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="right">${item.quantity}</td>
      <td class="right">R$ ${item.unitPrice.toFixed(2)}</td>
      <td class="right">R$ ${(item.quantity * item.unitPrice).toFixed(2)}</td>
    </tr>`).join("");

  const discount = params.discount ?? 0;
  const ctaButton = params.paymentUrl
    ? `<a href="${params.paymentUrl}" class="cta-button">💳 Pagar Fatura Online</a>`
    : "";

  const body = `
    <div class="header">
      <h1>📄 Fatura ${params.number}</h1>
      <p>${params.companyName ?? FROM_NAME}</p>
    </div>
    <div class="body">
      <span class="badge badge-${params.status}">${statusLabel[params.status] ?? params.status}</span>
      <p style="font-size:15px;color:#374151;margin-bottom:20px;">Olá, <strong>${params.clientName}</strong>! Segue sua fatura conforme detalhado abaixo.</p>
      <div class="info-grid">
        <div class="info-block">
          <div class="label">Número</div>
          <div class="value">${params.number}</div>
        </div>
        <div class="info-block">
          <div class="label">Vencimento</div>
          <div class="value">${dueDateStr}</div>
        </div>
      </div>
      <div class="section-title">Itens</div>
      <table class="items">
        <thead><tr><th>Descrição</th><th style="text-align:right">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>R$ ${params.subtotal.toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="totals-row"><span>Desconto</span><span>- R$ ${discount.toFixed(2)}</span></div>` : ""}
        <div class="totals-total"><span>Total</span><span>R$ ${params.total.toFixed(2)}</span></div>
      </div>
      ${ctaButton}
      ${params.notes ? `<div class="notes"><strong>Observações:</strong> ${params.notes}</div>` : ""}
    </div>`;

  return buildEmailWrapper(
    `Fatura ${params.number} - ${params.companyName ?? FROM_NAME}`,
    `Fatura ${params.number} no valor de R$ ${params.total.toFixed(2)} — vencimento ${dueDateStr}`,
    body
  );
}

// ─── QUOTE EMAIL ───────────────────────────────────────────────────────────────

export function buildQuoteEmail(params: {
  number: string;
  clientName: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  discount?: number | null;
  total: number;
  validUntil?: Date | null;
  notes?: string | null;
  status: string;
  companyName?: string;
}) {
  const statusLabel: Record<string, string> = {
    draft: "Rascunho", sent: "Enviado", accepted: "Aceito", rejected: "Recusado", expired: "Expirado",
  };
  const validStr = params.validUntil
    ? new Date(params.validUntil).toLocaleDateString("pt-BR")
    : "—";

  const itemsRows = params.items.map(item => `
    <tr>
      <td>${item.description}</td>
      <td class="right">${item.quantity}</td>
      <td class="right">R$ ${item.unitPrice.toFixed(2)}</td>
      <td class="right">R$ ${(item.quantity * item.unitPrice).toFixed(2)}</td>
    </tr>`).join("");

  const discount = params.discount ?? 0;

  const body = `
    <div class="header">
      <h1>📋 Orçamento ${params.number}</h1>
      <p>${params.companyName ?? FROM_NAME}</p>
    </div>
    <div class="body">
      <span class="badge badge-${params.status}">${statusLabel[params.status] ?? params.status}</span>
      <p style="font-size:15px;color:#374151;margin-bottom:20px;">Olá, <strong>${params.clientName}</strong>! Segue o orçamento solicitado.</p>
      <div class="info-grid">
        <div class="info-block">
          <div class="label">Número</div>
          <div class="value">${params.number}</div>
        </div>
        <div class="info-block">
          <div class="label">Válido até</div>
          <div class="value">${validStr}</div>
        </div>
      </div>
      <div class="section-title">Itens</div>
      <table class="items">
        <thead><tr><th>Descrição</th><th style="text-align:right">Qtd</th><th style="text-align:right">Unit.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${itemsRows}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>R$ ${params.subtotal.toFixed(2)}</span></div>
        ${discount > 0 ? `<div class="totals-row"><span>Desconto</span><span>- R$ ${discount.toFixed(2)}</span></div>` : ""}
        <div class="totals-total"><span>Total</span><span>R$ ${params.total.toFixed(2)}</span></div>
      </div>
      ${params.notes ? `<div class="notes"><strong>Observações:</strong> ${params.notes}</div>` : ""}
      <p style="font-size:13px;color:#6b7280;margin-top:16px;">Para aceitar este orçamento ou tirar dúvidas, entre em contato conosco.</p>
    </div>`;

  return buildEmailWrapper(
    `Orçamento ${params.number} - ${params.companyName ?? FROM_NAME}`,
    `Orçamento ${params.number} no valor de R$ ${params.total.toFixed(2)} — válido até ${validStr}`,
    body
  );
}

// ─── CONTRACT EMAIL ────────────────────────────────────────────────────────────

export function buildContractEmail(params: {
  number: string;
  clientName: string;
  title: string;
  type: string;
  value?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
  status: string;
  notes?: string | null;
  companyName?: string;
}) {
  const statusLabel: Record<string, string> = {
    draft: "Rascunho", sent: "Enviado", signed: "Assinado", cancelled: "Cancelado",
  };
  const startStr = params.startDate ? new Date(params.startDate).toLocaleDateString("pt-BR") : "—";
  const endStr = params.endDate ? new Date(params.endDate).toLocaleDateString("pt-BR") : "—";

  const body = `
    <div class="header">
      <h1>📝 Contrato ${params.number}</h1>
      <p>${params.companyName ?? FROM_NAME}</p>
    </div>
    <div class="body">
      <span class="badge badge-${params.status}">${statusLabel[params.status] ?? params.status}</span>
      <p style="font-size:15px;color:#374151;margin-bottom:20px;">Olá, <strong>${params.clientName}</strong>! Segue o contrato para sua análise.</p>
      <div class="info-grid">
        <div class="info-block">
          <div class="label">Número</div>
          <div class="value">${params.number}</div>
        </div>
        <div class="info-block">
          <div class="label">Tipo</div>
          <div class="value">${params.type}</div>
        </div>
        <div class="info-block">
          <div class="label">Início</div>
          <div class="value">${startStr}</div>
        </div>
        <div class="info-block">
          <div class="label">Término</div>
          <div class="value">${endStr}</div>
        </div>
      </div>
      ${params.value ? `
      <div class="totals">
        <div class="totals-total"><span>Valor do Contrato</span><span>R$ ${params.value.toFixed(2)}</span></div>
      </div>` : ""}
      ${params.notes ? `<div class="notes"><strong>Observações:</strong> ${params.notes}</div>` : ""}
      <p style="font-size:13px;color:#6b7280;margin-top:16px;">Em caso de dúvidas sobre o contrato, entre em contato conosco.</p>
    </div>`;

  return buildEmailWrapper(
    `Contrato ${params.number} - ${params.companyName ?? FROM_NAME}`,
    `Contrato ${params.number} — ${params.title}`,
    body
  );
}

// ─── SEND EMAIL ────────────────────────────────────────────────────────────────

export async function sendEmail(params: {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!BREVO_API_KEY) {
    console.warn("[Email] BREVO_API_KEY not set — skipping email send");
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  try {
    const client = getClient();
    const result = await client.transactionalEmails.sendTransacEmail({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: params.to, name: params.toName ?? params.to }],
      subject: params.subject,
      htmlContent: params.htmlContent,
    });

    const messageId = (result as { messageId?: string })?.messageId ?? "sent";
    console.log(`[Email] Sent to ${params.to} — messageId: ${messageId}`);
    return { success: true, messageId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Email] Send failed:", message);
    return { success: false, error: message };
  }
}

// ─── CONVENIENCE SENDERS ──────────────────────────────────────────────────────

export async function sendInvoiceEmail(params: {
  to: string;
  toName?: string;
  subject?: string;
  invoice: Parameters<typeof buildInvoiceEmail>[0];
}) {
  const html = buildInvoiceEmail(params.invoice);
  return sendEmail({
    to: params.to,
    toName: params.toName,
    subject: params.subject ?? `Fatura ${params.invoice.number} - ${FROM_NAME}`,
    htmlContent: html,
  });
}

export async function sendQuoteEmail(params: {
  to: string;
  toName?: string;
  subject?: string;
  quote: Parameters<typeof buildQuoteEmail>[0];
}) {
  const html = buildQuoteEmail(params.quote);
  return sendEmail({
    to: params.to,
    toName: params.toName,
    subject: params.subject ?? `Orçamento ${params.quote.number} - ${FROM_NAME}`,
    htmlContent: html,
  });
}

export async function sendContractEmail(params: {
  to: string;
  toName?: string;
  subject?: string;
  contract: Parameters<typeof buildContractEmail>[0];
}) {
  const html = buildContractEmail(params.contract);
  return sendEmail({
    to: params.to,
    toName: params.toName,
    subject: params.subject ?? `Contrato ${params.contract.number} - ${FROM_NAME}`,
    htmlContent: html,
  });
}
