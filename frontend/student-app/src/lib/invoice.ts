import { t, type PaymentRequest } from '@rafeeq/shared';
import { getApiLocale, saveInvoicePdf as save } from '@rafeeq/ui';

/**
 * The student's receipt: a wallet top-up.
 *
 * Only the wording differs from the captain's — «إيصال شحن محفظة» against «إيصال
 * معاملة» — and that one string was most of why the whole 60-line builder existed
 * twice. The HTML, the token-derived styling and the share flow are in
 * `@rafeeq/ui`.
 */
export function saveInvoicePdf(p: PaymentRequest, holderName: string): Promise<void> {
  const locale = getApiLocale();
  const tr = (key: string) => t(locale, key);

  return save(p, holderName, {
    kind: tr('payments.receiptTopUp'),
    heading: tr('payments.receiptHeading'),
    reference: tr('payments.receiptReference'),
    holder: tr('payments.receiptHolder'),
    purpose: tr('payments.receiptPurpose'),
    method: tr('payments.receiptMethod'),
    statusLabel: tr('payments.receiptStatus'),
    amount: tr('payments.receiptAmount'),
    footer: tr('payments.receiptFooter'),
    shareTitle: (number) => `${tr('payments.receiptShare')} ${number}`,
  });
}
