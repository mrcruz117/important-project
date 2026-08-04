export interface RecordSubmission {
  name: string;
  email: string;
  message: string;
}

export interface SavedRecord extends RecordSubmission {
  id: number;
  owner: string;
}

export interface CreateRecordRequest extends RecordSubmission {
  owner: string;
}