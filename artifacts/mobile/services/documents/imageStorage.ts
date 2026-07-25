import * as FileSystem from "expo-file-system";

const DOCUMENTS_DIR = `${FileSystem.documentDirectory}documents/`;

async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DOCUMENTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOCUMENTS_DIR, { intermediates: true });
  }
}

export async function saveDocumentImage(
  sourceUri: string,
  documentId: string
): Promise<string> {
  await ensureDir();
  const ext = sourceUri.split(".").pop() ?? "jpg";
  const dest = `${DOCUMENTS_DIR}${documentId}.${ext}`;

  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function deleteDocumentImage(uri: string): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    }
  } catch {}
}

export async function getDocumentImageUri(
  documentId: string
): Promise<string | null> {
  const info = await FileSystem.getInfoAsync(DOCUMENTS_DIR);
  if (!info.exists) return null;

  const files = await FileSystem.readDirectoryAsync(DOCUMENTS_DIR);
  const match = files.find((f: string) => f.startsWith(documentId));
  if (!match) return null;

  return `${DOCUMENTS_DIR}${match}`;
}
