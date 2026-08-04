import { useEffect, useState, type FormEvent } from 'react';
import RecordForm from './components/RecordForm';
import RecordsList from './components/RecordsList';
import { deleteRecord, fetchDeletedRecords, fetchRecords, getErrorMessage, restoreRecord, seedDatabase, submitRecord } from './services/recordsApi';
import type { RecordSubmission, SavedRecord } from './types/record';
import { validateRecord } from './utils/validateRecord';
import './App.css';

const emptyForm: RecordSubmission = {
  owner:'',
  name: '',
  email: '',
  message: '',
};

function App() {
  const [values, setValues] = useState<RecordSubmission>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof RecordSubmission, string>>>({});
  const [records, setRecords] = useState<SavedRecord[]>([]);
  const [deletedRecords, setDeletedRecords] = useState<SavedRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showDeletedRecords, setShowDeletedRecords] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SavedRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMessage, setEditMessage] = useState("")

  useEffect(() => {
    void loadRecords();
  }, []);

  async function loadRecords() {
    setIsLoadingRecords(true);
    setRecordsError(null);

    try {
      const [nextRecords, nextDeletedRecords] = await Promise.all([fetchRecords(), fetchDeletedRecords()]);
      setRecords(nextRecords);
      setDeletedRecords(nextDeletedRecords);
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

  const handleDelete = async (id: number) => {
    setFeedback(null);
    setRecordsError(null);

    try {
      const deletedRecord = await deleteRecord(id);
      setRecords((prev) => prev.filter((record) => record.id !== id));
      setDeletedRecords((prev) => {
        if (prev.some((record) => record.id === deletedRecord.id)) {
          return prev;
        }

        return [deletedRecord, ...prev];
      });
      setFeedback('Record deleted successfully.');
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const handleRestore = async (id: number) => {
    setFeedback(null);
    setRecordsError(null);

    try {
      const restoredRecord = await restoreRecord(id);
      setDeletedRecords((prev) => prev.filter((record) => record.id !== id));
      setRecords((prev) => {
        if (prev.some((record) => record.id === restoredRecord.id)) {
          return prev;
        }

        return [restoredRecord, ...prev];
      });
      setFeedback('Record restored successfully.');
      setShowDeletedRecords(false);
    } catch (error) {
      setFeedback(getErrorMessage(error));
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setFeedback(null);
    setRecordsError(null);

    try {
      const result = await seedDatabase();
      await loadRecords();
      setFeedback(`Seed complete: ${result.inserted} inserted, ${result.duplicates_skipped} duplicates skipped.`);
    } catch (error) {
      setFeedback(getErrorMessage(error));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleEdit = (record: SavedRecord) => {
    setEditingRecord(record);

    setEditName(record.name);
    setEditEmail(record.email);
    setEditMessage(record.message);
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    try {
      const response = await fetch(`http://localhost:8000/records/${editingRecord.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...editingRecord,
            name: editName,
            email: editEmail,
            message: editMessage,
          }),
        }
      );

      if (!response.ok) {
        throw new Error();
      }

      const updatedRecord = await response.json();

      setRecords((prev) =>
        prev.map((record) =>
          record.id === updatedRecord.id
            ? updatedRecord
            : record
        )
      );

      setEditingRecord(null);

      setFeedback("Record updated successfully.");
    } catch (error) {
      setFeedback(getErrorMessage(error));
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
          <div className="hero-actions">
            <button type="button" className="secondary-button" onClick={() => { void handleSeedDatabase(); }} disabled={isSeeding}>
              {isSeeding ? 'Seeding…' : 'Seed sample records'}
            </button>
          </div>
        </div>
      </header>

      {feedback ? (
        <p className={`feedback ${feedback.includes('successfully') ? 'success' : 'error'}`}>
          {feedback}
        </p>
      ) : null}

      <main className="content-grid">
        <div className="list-toggle" role="group" aria-label="Record list view">
          <button type="button" className={showDeletedRecords ? 'secondary-button' : 'primary-button'} onClick={() => setShowDeletedRecords(false)}>
            Active records
          </button>
          <button type="button" className={showDeletedRecords ? 'primary-button' : 'secondary-button'} onClick={() => setShowDeletedRecords(true)}>
            Deleted records
          </button>
        </div>
        <RecordForm
          values={values}
          errors={errors}
          isSubmitting={isSubmitting}
          onChange={handleChange}
          onSubmit={handleSubmit}
        />

        {editingRecord && (
          <section className="card">
            <h2>Edit Record</h2>
            <input
              value={editName}
              onChange={(e) =>
                setEditName(e.target.value)
              }
            />
            <input
              value={editEmail}
              onChange={(e) =>
                setEditEmail(e.target.value)
              }
            />
            <textarea
              value={editMessage}
              onChange={(e) =>
                setEditMessage(e.target.value)
              }
            />
            <button onClick={handleSaveEdit}>
              Save
            </button>
            <button
              onClick={() => setEditingRecord(null)}
            >
              Cancel
            </button>
          </section>
        )}
        
        <RecordsList
          records={records}
          deletedRecords={deletedRecords}
          isLoading={isLoadingRecords}
          error={recordsError}
          onDelete={handleDelete}
          onRestore={handleRestore}
          onToggleView={() => setShowDeletedRecords((current) => !current)}
          showDeletedRecords={showDeletedRecords}
          onEdit={handleEdit}
        />
      </main>
    </div>
  );
}

export default App;
// hmr test
