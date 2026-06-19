import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { PaymentRequest } from '@rafeeq/shared';

/**
 * Build an Arabic (RTL) HTML invoice for a payment request and let the user
 * save/share it as a PDF — so a copy of every CliQ top-up stays on the device.
 */
function invoiceHtml(p: PaymentRequest, holderName: string): string {
  const date = p.created_at ? new Date(p.created_at).toLocaleString('ar') : '';
  const amount = `${p.amount_jod.toFixed(3)} ${p.currency}`;
  return `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8"/>
  <style>
    *{font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;box-sizing:border-box}
    body{padding:36px;color:#0B192C}
    .head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #0B192C;padding-bottom:16px}
    .brand{font-size:26px;font-weight:800;color:#0B192C}
    .brand span{color:#1FB6C1}
    .tag{color:#64748b;font-size:12px}
    h1{font-size:18px;margin:28px 0 8px}
    table{width:100%;border-collapse:collapse;margin-top:10px}
    td{padding:10px 8px;border-bottom:1px solid #e2e8f0;font-size:14px}
    td.k{color:#64748b;width:40%}
    .total{font-size:20px;font-weight:800;color:#1FB6C1}
    .status{display:inline-block;padding:4px 12px;border-radius:999px;background:#ecfeff;color:#0e7490;font-weight:700;font-size:12px}
    .foot{margin-top:40px;color:#94a3b8;font-size:11px;text-align:center}
  </style></head><body>
    <div class="head">
      <div class="brand">رفيق <span>JO</span></div>
      <div class="tag">إيصال شحن محفظة<br/>${date}</div>
    </div>
    <h1>تفاصيل الفاتورة</h1>
    <table>
      <tr><td class="k">الرقم المرجعي</td><td>${p.number}</td></tr>
      <tr><td class="k">صاحب الحساب</td><td>${holderName}</td></tr>
      <tr><td class="k">الغرض</td><td>${p.purpose_label}</td></tr>
      <tr><td class="k">طريقة الدفع</td><td>CliQ</td></tr>
      <tr><td class="k">الحالة</td><td><span class="status">${p.status_label}</span></td></tr>
      <tr><td class="k">المبلغ</td><td class="total">${amount}</td></tr>
    </table>
    <div class="foot">هذه فاتورة إلكترونية صادرة عن تطبيق رفيق — يُرجى الاحتفاظ بها كمرجع.</div>
  </body></html>`;
}

export async function saveInvoicePdf(p: PaymentRequest, holderName: string): Promise<void> {
  const html = invoiceHtml(p, holderName);

  if (Platform.OS === 'web') {
    // On web, open the system print dialog (save as PDF).
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `فاتورة ${p.number}`, UTI: 'com.adobe.pdf' });
  }
}
