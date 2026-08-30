import { Platform } from 'react-native';

/**
 * Pick a CliQ transfer-receipt image, returning a value ready to append to
 * FormData. On native we use the image library (receipts are usually
 * screenshots); on web we fall back to a hidden file input. Never throws.
 *
 * ── Why this moved out of `student-app/src/lib` ────────────────────────────
 *
 * The captain app had its own copy, inline in `invoices.tsx`, and the two had
 * DIVERGED: the captain's version opened with `if (Platform.OS === 'web') return
 * null`, so on the web build the upload button ran, resolved to null, and returned
 * silently. A captain could not attach a payout receipt and nothing told him why.
 *
 * Both apps upload the same artefact to the same endpoint, so there is one picker.
 */

function pickImageWeb(): Promise<unknown> {
  return new Promise((resolve) => {
    const doc = (globalThis as unknown as { document?: any }).document;
    if (!doc) return resolve(null);
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

export async function pickProof(): Promise<Blob | null> {
  try {
    if (Platform.OS === 'web') {
      return (await pickImageWeb()) as Blob | null;
    }
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (res.canceled || !res.assets?.length) return null;
    const asset = res.assets[0];
    const name = asset.fileName ?? `receipt-${Date.now()}.jpg`;
    return { uri: asset.uri, name, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob;
  } catch {
    return null;
  }
}
