import type { RecordSubmission, SavedRecord } from '../types/record';

const API_BASE_URL = 'http://localhost:8000';

function getCurrentUser(): string {
  const savedUser = localStorage.getItem('activeUser');

  if (!savedUser) {
    return 'mcruz';
  }

  return JSON.parse(savedUser).username;
}


export interface RestoreResponse {
  message: string;
}

export interface SeedResponse {
  message: string;
  inserted: number;
  duplicates_skipped: number;
  total_attempted: number;
  errors?: Array<{ email: string; error: string }> | null;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

export async function fetchRecords(): Promise<SavedRecord[]> {
  const response = await fetch(`${API_BASE_URL}/records`);

  if (!response.ok) {
    const errorBody = await parseJson<{ detail?: string }>(response);
    throw new Error(errorBody.detail ?? 'Unable to load saved records.');
  }

  const data = await parseJson<SavedRecord[] | { records?: SavedRecord[] }>(response);

  if (Array.isArray(data)) {
    return data;
  }

  return data.records ?? [];
}

export async function submitRecord(payload: RecordSubmission): Promise<SavedRecord> {
  const response = await fetch(`${API_BASE_URL}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User': getCurrentUser(),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await parseJson<{ detail?: string }>(response);
    throw new Error(errorBody.detail ?? 'Unable to save the submission.');
  }

  return parseJson<SavedRecord>(response);
}

export async function deleteRecord(recordId: number): Promise<SavedRecord> {
  const response = await fetch(`${API_BASE_URL}/records/${recordId}`, {
    method: 'DELETE',
    headers: {
      'X-User': getCurrentUser(),
    },
  });

  if (!response.ok) {
    const errorBody = await parseJson<{ detail?: string }>(response);
    throw new Error(errorBody.detail ?? 'Unable to delete the record.');
  }

  return parseJson<SavedRecord>(response);
}

export async function fetchDeletedRecords(): Promise<SavedRecord[]> {
  const response = await fetch(`${API_BASE_URL}/records/deleted`);

  if (!response.ok) {
    const errorBody = await parseJson<{ detail?: string }>(response);
    throw new Error(errorBody.detail ?? 'Unable to load deleted records.');
  }

  const data = await parseJson<SavedRecord[] | { records?: SavedRecord[] }>(response);

  if (Array.isArray(data)) {
    return data;
  }

  return data.records ?? [];
}

export async function restoreRecord(recordId: number): Promise<SavedRecord> {
  const response = await fetch(`${API_BASE_URL}/records/${recordId}/restore`, {
    method: 'POST',
    headers: {
      'X-User': getCurrentUser(),
    },
  });

  if (!response.ok) {
    const errorBody = await parseJson<{ detail?: string }>(response);
    throw new Error(errorBody.detail ?? 'Unable to restore the record.');
  }

  return parseJson<SavedRecord>(response);
}

export async function seedDatabase(): Promise<SeedResponse> {
  const response = await fetch(`${API_BASE_URL}/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User': getCurrentUser(),
    },
  });

  if (!response.ok) {
    const errorBody = await parseJson<{ detail?: string }>(response);
    throw new Error(errorBody.detail ?? 'Unable to seed the database.');
  }

  return parseJson<SeedResponse>(response);
}

export { getErrorMessage };
