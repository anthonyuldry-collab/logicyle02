import { uploadFile } from './firebaseService';

export async function uploadExpenseReceiptImage(
  teamId: string,
  userId: string,
  receiptId: string,
  dataUrl: string,
  mimeType: string
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `teams/${teamId}/expenseReceipts/${userId}/${receiptId}.${ext}`;
  return uploadFile(dataUrl, path, mimeType);
}
