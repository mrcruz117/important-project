import type { RecordSubmission, SavedRecord } from '../types/record';

const API_BASE_URL = 'http://localhost:8000';

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
    const errorBody = await parseJson<{detail?: string}>(response);
    throw new Error(errorBody.detail ?? 'Unable to load saved records.');
  }

  const data = await parseJson<SavedRecord[] | {records?: SavedRecord[]}>(response);

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
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await parseJson<{detail?: string}>(response);
    throw new Error(errorBody.detail ?? 'Unable to save the submission.');
  }

  return parseJson<SavedRecord>(response);
}

export { getErrorMessage };
