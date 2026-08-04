<<<<<<< HEAD
import { useEffect, useState, type FormEvent } from 'react';
import RecordForm from './components/RecordForm';
import RecordsList from './components/RecordsList';
import { deleteRecord, fetchDeletedRecords, fetchRecords, getErrorMessage, restoreRecord, seedDatabase, submitRecord } from './services/recordsApi';
import type { RecordSubmission, SavedRecord } from './types/record';
import { validateRecord } from './utils/validateRecord';
import './App.css';

type ToastVariant = 'success' | 'error';

type Toast = {
  id: number;
  title: string;
  description: string;
  variant: ToastVariant;
};

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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showDeletedRecords, setShowDeletedRecords] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SavedRecord | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMessage, setEditMessage] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const pushToast = (title: string, description: string, variant: ToastVariant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((currentToasts) => [...currentToasts, { id, title, description, variant }]);
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const handleChange = (field: keyof RecordSubmission, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateRecord(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const errorMessage = Object.values(nextErrors).find(Boolean) ?? 'Please review the highlighted fields and try again.';
      pushToast('Validation error', errorMessage, 'error');
      return;
    }

    setIsSubmitting(true);
    setRecordsError(null);

    try {
      const createdRecord = await submitRecord(values);
      setRecords((currentRecords) => [createdRecord, ...currentRecords]);
      setValues(emptyForm);
      setErrors({});
      pushToast('Submission saved', 'Your record was saved successfully.', 'success');
      setIsFormOpen(false);
    } catch (error) {
      pushToast('Submission failed', getErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
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
      pushToast('Record deleted', 'The record was moved to deleted items.', 'success');
    } catch (error) {
      pushToast('Delete failed', getErrorMessage(error), 'error');
    }
  };

  const handleRestore = async (id: number) => {
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
      pushToast('Record restored', 'The record was restored to the active list.', 'success');
    } catch (error) {
      pushToast('Restore failed', getErrorMessage(error), 'error');
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setRecordsError(null);

    try {
      const result = await seedDatabase();
      await loadRecords();
      pushToast('Seed complete', `${result.inserted} inserted, ${result.duplicates_skipped} duplicates skipped.`, 'success');
    } catch (error) {
      pushToast('Seed failed', getErrorMessage(error), 'error');
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
          <h1>Submission workspace</h1>
          <p className="hero-copy">
            Capture new submissions in a focused dialog and review the latest records from the API in the main workspace.
          </p>
        </div>
      </header>

      <div className="toast-container" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.variant}`} role="status">
            <div>
              <p className="toast-title">{toast.title}</p>
              <p className="toast-description">{toast.description}</p>
            </div>
          </div>
        ))}
      </div>

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
        <section className="records-shell">
          <RecordsList
            records={records}
            deletedRecords={deletedRecords}
            isLoading={isLoadingRecords}
            error={recordsError}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onToggleView={() => setShowDeletedRecords((current) => !current)}
            showDeletedRecords={showDeletedRecords}
            onOpenForm={() => setIsFormOpen(true)}
            onSeed={handleSeedDatabase}
            isSeeding={isSeeding}
          />
        </section>
      </main>

      {isFormOpen ? (
        <div className="dialog-backdrop" role="presentation" onClick={() => setIsFormOpen(false)}>
          <div className="dialog-panel" role="dialog" aria-modal="true" aria-label="Create a submission" onClick={(event) => event.stopPropagation()}>
            <RecordForm
              values={values}
              errors={errors}
              isSubmitting={isSubmitting}
              onChange={handleChange}
              onSubmit={handleSubmit}
              className="dialog-form"
              onClose={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
// hmr test
=======
import { useEffect, useState, type FormEvent } from 'react';
import RecordForm from './components/RecordForm';
import RecordsList from './components/RecordsList';
import { deleteRecord, fetchDeletedRecords, fetchRecords, getErrorMessage, restoreRecord, seedDatabase, submitRecord } from './services/recordsApi';
import type { RecordSubmission, SavedRecord } from './types/record';
import { validateRecord } from './utils/validateRecord';
import './App.css';

type ToastVariant = 'success' | 'error';

type Toast = {
  id: number;
  title: string;
  description: string;
  variant: ToastVariant;
};

const emptyForm: RecordSubmission = {
  name: '',
  email: '',
  message: '',
  owner:  '',
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showDeletedRecords, setShowDeletedRecords] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

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

  const pushToast = (title: string, description: string, variant: ToastVariant = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((currentToasts) => [...currentToasts, { id, title, description, variant }]);
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
    }, 3200);
  };

  const handleChange = (field: keyof RecordSubmission, value: string) => {
    setValues((currentValues) => ({ ...currentValues, [field]: value }));
    setErrors((currentErrors) => ({ ...currentErrors, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateRecord(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const errorMessage = Object.values(nextErrors).find(Boolean) ?? 'Please review the highlighted fields and try again.';
      pushToast('Validation error', errorMessage, 'error');
      return;
    }

    setIsSubmitting(true);
    setRecordsError(null);

    try {
      const createdRecord = await submitRecord(values);
      setRecords((currentRecords) => [createdRecord, ...currentRecords]);
      setValues(emptyForm);
      setErrors({});
      pushToast('Submission saved', 'Your record was saved successfully.', 'success');
      setIsFormOpen(false);
    } catch (error) {
      pushToast('Submission failed', getErrorMessage(error), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
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
      pushToast('Record deleted', 'The record was moved to deleted items.', 'success');
    } catch (error) {
      pushToast('Delete failed', getErrorMessage(error), 'error');
    }
  };

  const handleRestore = async (id: number) => {
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
      pushToast('Record restored', 'The record was restored to the active list.', 'success');
    } catch (error) {
      pushToast('Restore failed', getErrorMessage(error), 'error');
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setRecordsError(null);

    try {
      const result = await seedDatabase();
      await loadRecords();
      pushToast('Seed complete', `${result.inserted} inserted, ${result.duplicates_skipped} duplicates skipped.`, 'success');
    } catch (error) {
      pushToast('Seed failed', getErrorMessage(error), 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Project Aegis</p>
          <h1>Submission workspace</h1>
          <p className="hero-copy">
            Capture new submissions in a focused dialog and review the latest records from the API in the main workspace.
          </p>
        </div>
      </header>

      <div className="toast-container" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.variant}`} role="status">
            <div>
              <p className="toast-title">{toast.title}</p>
              <p className="toast-description">{toast.description}</p>
            </div>
          </div>
        ))}
      </div>

      <main className="content-grid">
        <section className="records-shell">
          <RecordsList
            records={records}
            deletedRecords={deletedRecords}
            isLoading={isLoadingRecords}
            error={recordsError}
            onDelete={handleDelete}
            onRestore={handleRestore}
            onToggleView={() => setShowDeletedRecords((current) => !current)}
            showDeletedRecords={showDeletedRecords}
            onOpenForm={() => setIsFormOpen(true)}
            onSeed={handleSeedDatabase}
            isSeeding={isSeeding}
            onEdit={()=>{}}
          />
        </section>
      </main>

      {isFormOpen ? (
        <div className="dialog-backdrop" role="presentation" onClick={() => setIsFormOpen(false)}>
          <div className="dialog-panel" role="dialog" aria-modal="true" aria-label="Create a submission" onClick={(event) => event.stopPropagation()}>
            <RecordForm
              values={values}
              errors={errors}
              isSubmitting={isSubmitting}
              onChange={handleChange}
              onSubmit={handleSubmit}
              className="dialog-form"
              onClose={() => setIsFormOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
// hmr test
>>>>>>> dev
