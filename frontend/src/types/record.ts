export interface RecordSubmission {
  owner: string;
  name: string;
  email: string;
  message: string;
}

export interface SavedRecord extends RecordSubmission {
  id: number;
}
