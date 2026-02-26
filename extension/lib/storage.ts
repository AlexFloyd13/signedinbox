export interface StoredAuth {
  accessToken: string;
  refreshToken: string;
  email: string;
  userId: string;
}

export async function getAuth(): Promise<StoredAuth | null> {
  const result = await chrome.storage.local.get('auth');
  return result.auth ?? null;
}

export async function setAuth(auth: StoredAuth): Promise<void> {
  await chrome.storage.local.set({ auth });
}

export async function clearAuth(): Promise<void> {
  await chrome.storage.local.remove('auth');
}

export async function getActiveSenderId(): Promise<string | null> {
  const result = await chrome.storage.local.get('activeSenderId');
  return result.activeSenderId ?? null;
}

export async function setActiveSenderId(id: string): Promise<void> {
  await chrome.storage.local.set({ activeSenderId: id });
}
