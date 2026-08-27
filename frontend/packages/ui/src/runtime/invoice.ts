import { Platform } from 'react-native';
import { formatJod, type PaymentRequest } from '@rafeeq/shared';
import { brand, fontStack, live, neutral, radius, status } from '@rafeeq/tokens';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

/* ═══════════════════════════════════════════════════════════════════════════
   The PDF receipt.

   ── Why this file was printing a brand that does not exist ─────────────────

   It carried eight literal hexes, and the two loudest were `#0B192C` for the
   wordmark and rules and `#1FB6C1` for the amount — a navy and a teal. The
   navy/teal identity was retired in phase 4, and phase 6 removed its values from
   every screen. It survived HERE because:

     • `check-design-tokens.mjs` matches the retired palette by VALUE, and these
       two are not the retired values — they are a *different* navy and teal that
       predate even that palette. A fourth and fifth identity, in one file.
     • Nothing renders this in the app. It is a string that becomes a PDF, so no
       reviewer ever looked at it next to a screen.

   The result: the only artefact of this product a user KEEPS — the receipt for
   money they sent — was the one place still wearing the dead brand. Now it is
   built from `@rafeeq/tokens`, so it cannot drift again without the gate seeing it.

   ── Why the labels are parameters ─────────────────────────────────────────

   The student's copy said «إيصال شحن محفظة», the captain's «إيصال معاملة», and
   that one string was most of why the file existed twice. A captain's payout is
   not a wallet top-up; the wording is a real difference, so it becomes an
   argument.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface InvoiceLabels {
  /** Under the wordmark, e.g. «إيصال شحن محفظة» or «إيصال معاملة». */
  kind: string;
  heading: string;
  reference: string;
  holder: string;
  purpose: string;
  method: string;
  statusLabel: string;
  amount: string;
  footer: string;
  /** Share-sheet title. Receives the receipt number. */
  shareTitle: (number: string) => string;
}

function invoiceHtml(p: PaymentRequest, holderName: string, l: InvoiceLabels): string {
  const date = p.created_at ? new Date(p.created_at).toLocaleString('ar') : '';

  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
  <style>
    *{font-family:${fontStack};box-sizing:border-box}
    body{padding:36px;color:${neutral[900]}}
    .head{display:flex;justify-content:space-between;align-items:center;
      border-bottom:3px solid ${brand[600]};padding-bottom:16px}
    .brand{font-size:26px;font-weight:700;color:${neutral[900]}}
    /* The destination dot is the only place a second colour is allowed — decision 13. */
    .brand span{color:${live.base}}
    .tag{color:${neutral[500]};font-size:12px}
    h1{font-size:18px;margin:28px 0 8px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    td{padding:10px 8px;border-bottom:1px solid ${neutral[200]};font-size:14px}
    td.k{color:${neutral[500]};width:40%}
    .total{font-size:20px;font-weight:700;color:${brand[600]}}
    .status{display:inline-block;padding:4px 12px;border-radius:${radius.pill}px;
      background:${status.successSoft};color:${status.success};font-weight:700;font-size:12px}
    .foot{margin-top:40px;color:${neutral[400]};font-size:11px;text-align:center}
  </style></head><body>
    <div class="head">
      <div class="brand">رفيق <span>JO</span></div>
      <div class="tag">${l.kind}<br/>${date}</div>
    </div>
    <h1>${l.heading}</h1>
    <table>
      <tr><td class="k">${l.reference}</td><td>${p.number}</td></tr>
      <tr><td class="k">${l.holder}</td><td>${holderName}</td></tr>
      <tr><td class="k">${l.purpose}</td><td>${p.purpose_label}</td></tr>
      <tr><td class="k">${l.method}</td><td>CliQ</td></tr>
      <tr><td class="k">${l.statusLabel}</td><td><span class="status">${p.status_label}</span></td></tr>
      <tr><td class="k">${l.amount}</td><td class="total">${formatJod(p.amount_fils)}</td></tr>
    </table>
    <div class="foot">${l.footer}</div>
  </body></html>`;
}

export async function saveInvoicePdf(
  p: PaymentRequest,
  holderName: string,
  labels: InvoiceLabels,
): Promise<void> {
  const html = invoiceHtml(p, holderName, labels);

  if (Platform.OS === 'web') {
    // The browser's print dialog is the "save as PDF" path on web.
    await Print.printAsync({ html });

    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: labels.shareTitle(p.number),
      UTI: 'com.adobe.pdf',
    });
  }
}
