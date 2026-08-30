import { Platform } from 'react-native';

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE PICKING — one module, for the two things this product uploads.

   ── Why this is shared ─────────────────────────────────────────────────────

   The captain app had its own copy of the receipt picker, inline in `invoices.tsx`,
   and the two had DIVERGED: the captain's opened with `if (Platform.OS === 'web')
   return null`, so on the web build the upload button ran, resolved to null, and
   returned silently. A captain could not attach a payout receipt and nothing said why.

   ── And why there were still TWO pickers after that was fixed ──────────────

   `driver-app/app/(app)/documents.tsx` kept 48 lines of its own — a STATIC
   `import * as ImagePicker`, its own camera-permission request, its own web/native
   Blob construction — while `invoices.tsx`, two files away, used `pickProof()`. Each
   knew something the other did not:

     • only the documents copy offered a CAMERA, which is how you photograph a licence
     • only the documents copy handled web at all, rebuilding a named `File` from the
       blob because the picker sometimes omits `.file` and the backend 422s on an
       unnamed multipart part
     • only `pickProof` requested media-library permission, and only it lazy-loaded
       `expo-image-picker` so a missing native module could not crash the bundle

   `pickImage` below is the union of the two. `pickProof` is kept as the one-argument
   spelling its four call sites already use.
   ═══════════════════════════════════════════════════════════════════════════ */

export interface PickImageOptions {
  /** `camera` photographs a document; `gallery` picks a screenshot of a transfer. */
  source?: 'camera' | 'gallery';
  /** JPEG quality, 0–1. Documents want detail; receipts do not. */
  quality?: number;
  /** Base filename, so the multipart part is named after what it IS. */
  name?: string;
}

export interface PickedImage {
  /** Ready to append to `FormData`. A real `File` on web, a `{uri,name,type}` on native. */
  file: Blob;
  /** Displayable immediately, for an optimistic thumbnail. */
  uri: string;
}

/**
 * Why nothing came back.
 *
 * `null` conflated two very different answers — «I changed my mind» and «the OS says
 * you may not use the camera» — and the caller could only stay silent. A refused
 * permission with no explanation is the exact shape of bug this codebase keeps
 * finding: the button works, nothing happens, and there is nothing to investigate.
 */
export type PickFailure = 'cancelled' | 'permission-denied' | 'unavailable';

function pickFromWebInput(): Promise<File | null> {
  return new Promise((resolve) => {
    const doc = (globalThis as unknown as { document?: any }).document;
    if (!doc) return resolve(null);
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    // `capture` asks a mobile browser for the camera directly; desktop ignores it.
    input.onchange = () => resolve(input.files && input.files[0] ? input.files[0] : null);
    input.click();
  });
}

/**
 * Turn a picked native asset into something `FormData` accepts.
 *
 * On web the picker sometimes omits `.file`, so the blob is refetched from the URI
 * and rebuilt as a NAMED `File` — the backend rejects an unnamed multipart part with
 * a 422 that reads as "file is required", which is the least helpful possible message
 * for a captain who just took a photo.
 */
async function toUploadable(asset: { uri: string; fileName?: string | null; mimeType?: string | null; file?: unknown }, name: string): Promise<Blob> {
  if (Platform.OS !== 'web') {
    return { uri: asset.uri, name: asset.fileName ?? `${name}.jpg`, type: asset.mimeType ?? 'image/jpeg' } as unknown as Blob;
  }

  const FileCtor = (globalThis as unknown as { File?: typeof File }).File;
  if (FileCtor && asset.file instanceof FileCtor) return asset.file;

  const blob = await (await fetch(asset.uri)).blob();
  const mime = blob.type && blob.type.startsWith('image/') ? blob.type : 'image/jpeg';
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  if (!FileCtor) return blob;

  return new FileCtor([blob], asset.fileName ?? `${name}.${ext}`, { type: mime });
}

/**
 * Pick an image from the camera or the gallery. Never throws; returns null when the
 * user cancels, the permission is refused, or the native module is unavailable.
 */
export async function pickImage(
  { source = 'gallery', quality = 0.8, name = 'upload' }: PickImageOptions = {},
): Promise<PickedImage | PickFailure> {
  try {
    if (Platform.OS === 'web') {
      const file = await pickFromWebInput();

      return file ? { file, uri: URL.createObjectURL(file) } : 'cancelled';
    }

    // Lazy: a missing native module must degrade, not crash the bundle at import time.
    const ImagePicker = await import('expo-image-picker').catch(() => null);
    if (!ImagePicker) return 'unavailable';

    /*
     * The permission the SOURCE needs, which the two old copies disagreed about — the
     * documents screen asked for the camera and never for the library, so picking from
     * the gallery on a fresh install failed with no explanation on some Android builds.
     */
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return 'permission-denied';

    const res =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality });

    if (res.canceled || !res.assets?.length) return 'cancelled';
    const asset = res.assets[0]!;

    return { file: await toUploadable(asset, name), uri: asset.uri };
  } catch {
    return 'unavailable';
  }
}

/** True when `pickImage` returned an image rather than a reason it did not. */
export function isPicked(result: PickedImage | PickFailure): result is PickedImage {
  return typeof result !== 'string';
}

/**
 * Pick a CliQ transfer receipt — the gallery, because a receipt is a screenshot.
 *
 * Kept as its own name because that is what its call sites mean, and because
 * `pickImage({ source: 'gallery', name: 'receipt' })` at four call sites is four
 * chances to pass something slightly different.
 */
export async function pickProof(): Promise<Blob | null> {
  const result = await pickImage({ source: 'gallery', quality: 0.8, name: `receipt-${Date.now()}` });

  return isPicked(result) ? result.file : null;
}
