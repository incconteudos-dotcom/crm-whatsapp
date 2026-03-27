/**
 * PDF Generation & Sending Helper
 * Generates real PDFs via WeasyPrint (Python) for invoices, quotes and contracts.
 * PDFs are uploaded to S3 and the URL is returned for WhatsApp/email sending.
 */

import { storagePut } from "./storage";
import { execSync } from "child_process";
import path from "path";

/**
 * Converts HTML string to a real PDF Buffer using WeasyPrint (Python).
 */
export function generatePdfBuffer(html: string): Buffer {
  const scriptPath = path.join(__dirname, "generate_pdf.py");
  const pdfBuffer = execSync(`python3 "${scriptPath}"`, {
    input: html,
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30000,
  });
  return pdfBuffer;
}

/**
 * Generates a real PDF from HTML and uploads it to S3.
 * Returns the public S3 URL of the PDF file.
 */
export async function uploadDocumentPdf(html: string, prefix: string): Promise<string> {
  const pdfBuffer = generatePdfBuffer(html);
  const key = `documents/${prefix}-${Date.now()}-${randomSuffix()}.pdf`;
  const { url } = await storagePut(key, pdfBuffer, "application/pdf");
  return url;
}

function randomSuffix() {
  return Math.random().toString(36).slice(2, 8);
}

// ─── INVOICE PDF ──────────────────────────────────────────────────────────────
export function buildInvoiceHtml(invoice: {
  number: string;
  clientName: string;
  clientEmail?: string | null;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
  subtotal: number;
  discount?: number | null;
  total: number;
  dueDate?: Date | null;
  notes?: string | null;
  status: string;
  companyName?: string;
}) {
  const statusLabel: Record<string, string> = {
    draft: "Rascunho", sent: "Enviada", paid: "Paga", overdue: "Vencida", cancelled: "Cancelada",
  };
  const statusColor: Record<string, string> = {
    draft: "#6b7280", sent: "#3b82f6", paid: "#10b981", overdue: "#ef4444", cancelled: "#6b7280",
  };

  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;text-align:right;">R$ ${item.unitPrice.toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;text-align:right;">R$ ${(item.quantity * item.unitPrice).toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Fatura ${invoice.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f0f; color: #e5e7eb; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #7c3aed, #4f46e5); padding: 40px; }
    .header h1 { font-size: 28px; font-weight: 700; color: white; }
    .header p { color: rgba(255,255,255,0.8); margin-top: 4px; font-size: 14px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 12px; }
    .body { padding: 40px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .meta-block label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-block p { font-size: 15px; color: #e5e7eb; margin-top: 4px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #2d2d2d; padding: 10px 12px; text-align: left; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    thead th:last-child, thead th:nth-child(3) { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2d2d2d; font-size: 14px; color: #9ca3af; }
    .totals-row.total { border-bottom: none; font-size: 18px; font-weight: 700; color: #e5e7eb; padding-top: 12px; }
    .notes { background: #2d2d2d; border-radius: 8px; padding: 16px; margin-top: 24px; }
    .notes label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .notes p { font-size: 13px; color: #d1d5db; margin-top: 6px; }
    .footer { text-align: center; padding: 24px; border-top: 1px solid #2d2d2d; color: #4b5563; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${invoice.companyName ?? "Estúdio de Podcast"}</h1>
      <p>Fatura Nº ${invoice.number}</p>
      <span class="badge" style="background:${statusColor[invoice.status] ?? "#6b7280"}20;color:${statusColor[invoice.status] ?? "#6b7280"};border:1px solid ${statusColor[invoice.status] ?? "#6b7280"}40;">
        ${statusLabel[invoice.status] ?? invoice.status}
      </span>
    </div>
    <div class="body">
      <div class="meta">
        <div class="meta-block">
          <label>Cliente</label>
          <p>${invoice.clientName}</p>
          ${invoice.clientEmail ? `<p style="font-size:13px;color:#6b7280;">${invoice.clientEmail}</p>` : ""}
        </div>
        <div class="meta-block">
          <label>Vencimento</label>
          <p>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("pt-BR") : "—"}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Qtd</th>
            <th>Valor Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>R$ ${invoice.subtotal.toFixed(2)}</span></div>
        ${invoice.discount ? `<div class="totals-row"><span>Desconto</span><span>- R$ ${invoice.discount.toFixed(2)}</span></div>` : ""}
        <div class="totals-row total"><span>Total</span><span>R$ ${invoice.total.toFixed(2)}</span></div>
      </div>

      ${invoice.notes ? `<div class="notes"><label>Observações</label><p>${invoice.notes}</p></div>` : ""}
    </div>
    <div class="footer">Documento gerado em ${new Date().toLocaleDateString("pt-BR")} · ${invoice.companyName ?? "Estúdio de Podcast"}</div>
  </div>
</body>
</html>`;
}

// ─── QUOTE PDF ────────────────────────────────────────────────────────────────
export function buildQuoteHtml(quote: {
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
  const itemsHtml = quote.items.map(item => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;">${item.description}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;text-align:center;">${item.quantity}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;text-align:right;">R$ ${item.unitPrice.toFixed(2)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #2d2d2d;color:#e5e7eb;text-align:right;">R$ ${(item.quantity * item.unitPrice).toFixed(2)}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Orçamento ${quote.number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #0f0f0f; color: #e5e7eb; padding: 40px; }
    .container { max-width: 800px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0891b2, #0e7490); padding: 40px; }
    .header h1 { font-size: 28px; font-weight: 700; color: white; }
    .header p { color: rgba(255,255,255,0.8); margin-top: 4px; font-size: 14px; }
    .body { padding: 40px; }
    .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 32px; }
    .meta-block label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
    .meta-block p { font-size: 15px; color: #e5e7eb; margin-top: 4px; font-weight: 500; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    thead th { background: #2d2d2d; padding: 10px 12px; text-align: left; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; }
    thead th:last-child, thead th:nth-child(3) { text-align: right; }
    thead th:nth-child(2) { text-align: center; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2d2d2d; font-size: 14px; color: #9ca3af; }
    .totals-row.total { border-bottom: none; font-size: 18px; font-weight: 700; color: #e5e7eb; padding-top: 12px; }
    .footer { text-align: center; padding: 24px; border-top: 1px solid #2d2d2d; color: #4b5563; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${quote.companyName ?? "Estúdio de Podcast"}</h1>
      <p>Orçamento Nº ${quote.number}</p>
    </div>
    <div class="body">
      <div class="meta">
        <div class="meta-block">
          <label>Cliente</label>
          <p>${quote.clientName}</p>
        </div>
        <div class="meta-block">
          <label>Válido até</label>
          <p>${quote.validUntil ? new Date(quote.validUntil).toLocaleDateString("pt-BR") : "—"}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th>Qtd</th>
            <th>Valor Unit.</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="totals">
        <div class="totals-row"><span>Subtotal</span><span>R$ ${quote.subtotal.toFixed(2)}</span></div>
        ${quote.discount ? `<div class="totals-row"><span>Desconto</span><span>- R$ ${quote.discount.toFixed(2)}</span></div>` : ""}
        <div class="totals-row total"><span>Total</span><span>R$ ${quote.total.toFixed(2)}</span></div>
      </div>
      ${quote.notes ? `<div style="background:#2d2d2d;border-radius:8px;padding:16px;margin-top:24px;"><p style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Observações</p><p style="font-size:13px;color:#d1d5db;margin-top:6px;">${quote.notes}</p></div>` : ""}
    </div>
    <div class="footer">Orçamento gerado em ${new Date().toLocaleDateString("pt-BR")} · ${quote.companyName ?? "Estúdio de Podcast"}</div>
  </div>
</body>
</html>`;
}

// ─── UPLOAD HTML AS PDF-LIKE FILE ─────────────────────────────────────────────
export async function uploadDocumentHtml(html: string, prefix: string): Promise<string> {
  const key = `documents/${prefix}-${Date.now()}-${randomSuffix()}.html`;
  const { url } = await storagePut(key, Buffer.from(html, "utf-8"), "text/html");
  return url;
}
