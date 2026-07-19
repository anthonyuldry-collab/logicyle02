import { uploadFile } from './firebaseService';

export type ReceiptStorageScope = 'team' | 'user';

export async function uploadExpenseReceiptImage(
  ownerId: string,
  userId: string,
  receiptId: string,
  dataUrl: string,
  mimeType: string,
  options?: { scope?: ReceiptStorageScope }
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const scope = options?.scope ?? 'team';
  const path =
    scope === 'user'
      ? `users/${userId}/expenseReceipts/${receiptId}.${ext}`
      : `teams/${ownerId}/expenseReceipts/${userId}/${receiptId}.${ext}`;
  return uploadFile(dataUrl, path, mimeType);
}
