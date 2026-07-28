import { useEffect, useState, type FormEvent } from 'react';
import RecordForm from './components/RecordForm';
import RecordsList from './components/RecordsList';
import { fetchRecords, getErrorMessage, submitRecord } from './services/recordsApi';
import type { RecordSubmission, SavedRecord } from './types/record';
import { validateRecord } from './utils/validateRecord';
import './App.css';

const emptyForm: RecordSubmission = {
  name: '',
  email: '',
  message: '',
};

function App() {
  const [values, setValues] = useState<RecordSubmission>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof RecordSubmission, string>>>({});
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    setIsLoadingRecords(true);
    setRecordsError(null);

    try {
      const nextRecords = await fetchRecords();
      setRecords(nextRecords);
    } catch (error) {
      setRecordsError(getErrorMessage(error));
    } finally {
      setIsLoadingRecords(false);
    }
  }

  const handleChange = (field: keyof RecordSubmission, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));

    if (feedback) {
      setFeedback(null);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateRecord(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setFeedback(null);
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setRecordsError(null);

    try {
      const createdRecord = await submitRecord(values);
      setRecords((currentRecords) => [createdRecord, ...currentRecords]);
      setValues(emptyForm);
      setFeedback('Submission saved successfully.');
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Project Aegis</p>
          <h1>ABSOLUTELY CRITICAL SUBMISSION PLATFORM!!!</h1>
          <p className="hero-copy">
            Capture submissions, validate them immediately, and review the latest records from the API.
          </p>
        </div>
      </header>

      {feedback ? (
        <p className={`feedback ${feedback.includes('successfully') ? 'success' : 'error'}`}>
          {feedback}
        </p>
      ) : null}

      <main className="content-grid">
        <RecordForm
          values={values}
          errors={errors}
          isSubmitting={isSubmitting}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

        <RecordsList records={records} isLoading={isLoadingRecords} error={recordsError} />
      </main>
    </div>
  );
}

export default App;
// hmr test
