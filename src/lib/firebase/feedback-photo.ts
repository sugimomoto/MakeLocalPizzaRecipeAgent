/**
 * Feedback photo upload (Slice 7 後追加)
 *
 * ユーザがフィードバック画面で選択した「作ってみた」写真を Firebase Storage の
 *   users/{uid}/feedback/{candidateId}/photo-{ts}.jpg
 * に保存し、ダウンロード URL を返す。
 *
 * - クライアント側で max 1600px の Canvas リサイズ + JPEG 圧縮 (品質 0.85)
 *   → 元画像が大きくても安全に upload できる (Storage rules で 5MB 上限)
 * - HEIC など Canvas に乗らない形式は元 file をそのまま送る (フォールバック)
 *
 * 戻り値: { url, path } — path は将来の削除/差し替え用に保持
 */

import {
  deleteObject,
  getDownloadURL,
  ref as storageRef,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

export type FeedbackPhotoUpload = {
  url: string;
  path: string;
};

/**
 * Canvas API でリサイズした Blob を返す。
 * - createImageBitmap が失敗 (HEIC など) したら null を返してフォールバック
 */
async function resizeToJpeg(file: File): Promise<Blob | null> {
  if (typeof window === 'undefined') return null;
  if (typeof createImageBitmap !== 'function') return null;
  try {
    const bitmap = await createImageBitmap(file);
    const longer = Math.max(bitmap.width, bitmap.height);
    const scale = longer > MAX_DIMENSION ? MAX_DIMENSION / longer : 1;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', JPEG_QUALITY);
    });
  } catch {
    return null;
  }
}

export async function uploadFeedbackPhoto(
  storage: FirebaseStorage,
  uid: string,
  candidateId: string,
  file: File,
): Promise<FeedbackPhotoUpload> {
  const resized = await resizeToJpeg(file);
  const blob: Blob = resized ?? file;
  const contentType = resized ? 'image/jpeg' : file.type || 'application/octet-stream';
  const ext = resized ? 'jpg' : (file.name.split('.').pop() ?? 'bin').toLowerCase().slice(0, 8);
  const path = `users/${uid}/feedback/${candidateId}/photo-${Date.now()}.${ext}`;
  const ref = storageRef(storage, path);
  await uploadBytes(ref, blob, { contentType });
  const url = await getDownloadURL(ref);
  return { url, path };
}

/** 既存写真の削除 (差し替え時の旧 path クリーンアップ用 — 失敗は無視) */
export async function deleteFeedbackPhotoByPath(
  storage: FirebaseStorage,
  path: string,
): Promise<void> {
  try {
    await deleteObject(storageRef(storage, path));
  } catch {
    /* not found 等は無視 */
  }
}
