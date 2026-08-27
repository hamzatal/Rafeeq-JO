import { t, type PaymentRequest } from '@rafeeq/shared';
import { getApiLocale, saveInvoicePdf as save } from '@rafeeq/ui';

/**
 * The captain's receipt: a transaction, not a wallet top-up.
 *
 * That one word — «معاملة» against «شحن محفظة» — was most of the reason this
 * 60-line HTML builder existed in both apps.
 */
export function saveInvoicePdf(p: PaymentRequest, holderName: string): Promise<void> {
  const locale = getApiLocale();
  const tr = (key: string) => t(locale, key);

  return save(p, holderName, {
    kind: tr('payments.receiptTransaction'),
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
