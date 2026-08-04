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

type UserRole = 'admin' | 'user' | 'read-only';

type ActiveUser = {
  username: string;
  role: UserRole;
}

const USERS: ActiveUser[] = [
  { username: "mcruz", role: "admin" },
  { username: "acheebez", role: "user" },
  { username: "gfrango", role: "user" },
  { username: 'bingus', role: 'read-only' },
];

const emptyForm: RecordSubmission = {
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
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<ActiveUser>(USERS[0]);

  useEffect(() => {
    const savedUser = localStorage.getItem('activeUser');
    if (savedUser) {
      setActiveUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('activeUser', JSON.stringify(activeUser));
  }, [activeUser]);

  const isAdmin = activeUser.role === 'admin';

  const isReadOnly = activeUser.role === 'read-only';

  const canCreateRecords = !isReadOnly;

  const canSeedDatabase = isAdmin;

  const canModifyRecord = (record: SavedRecord) => {
    if (activeUser.role === 'admin') {
      return true;
    }

    if (activeUser.role === 'user') {
      return record.owner === activeUser.username;
    }

    return false;
  };

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

    if (!canCreateRecords) {
      pushToast(
        'Permission denied',
        'Read-only users cannot create records.',
        'error'
      );
      return;
    }

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

      if (editingRecord) {
        await handleSaveEdit();
        return;
      }

      const createdRecord = await submitRecord({
        ...values,
        owner: activeUser.username,
      });
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


    const record = records.find((item) => item.id === id);

    if (!record || !canModifyRecord(record)) {
      pushToast(
        'Permission denied',
        'You can only delete your own records.',
        'error'
      );
      return;
    }

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

    const record = deletedRecords.find((item) => item.id === id);

    if (!record || !canModifyRecord(record)) {
      pushToast(
        'Permission denied',
        'You can only restore your own records.',
        'error'
      );
      return;
    }

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

    if (!canSeedDatabase) {
      pushToast(
        'Permission denied',
        'Only admins can seed the database.',
        'error'
      );
      return;
    }

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

    if (!canModifyRecord(record)) {
      pushToast(
        'Permission denied',
        'You can only edit your own records.',
        'error'
      );
      return;
    }

    setEditingRecord(record);

    setValues({
      name: record.name,
      email: record.email,
      message: record.message,
    });
    setIsFormOpen(true);
  }

  const handleSaveEdit = async () => {
    if (!editingRecord) return;

    try {
      const response = await fetch(`http://localhost:8000/records/${editingRecord.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-User": activeUser.username,
          },
          body: JSON.stringify({
            ...editingRecord,
            name: values.name,
            email: values.email,
            message: values.message,
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

      pushToast("Record updated successfully.", "", "success");
    } catch (error) {
      pushToast("Update failed", getErrorMessage(error), "error");
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
          <div className="user-switcher">
            <select
              value={activeUser.username}
              onChange={(event) => {
                const selectedUser = USERS.find(
                  (user) => user.username === event.target.value
                );

                if (selectedUser) {
                  setActiveUser(selectedUser);
                }
              }}
            >
              {USERS.map((user) => (
                <option
                  key={user.username}
                  value={user.username}
                >
                  {user.username} ({user.role})
                </option>
              ))}
            </select>
          </div>
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
            onEdit={handleEdit}
            activeUser={activeUser}
          />
        </section>
      </main>

      {isFormOpen ? (
        <div
          className="dialog-backdrop"
          role="presentation"
          onClick={() => setIsFormOpen(false)}
        >
          <div
            className="dialog-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Create a submission"
            onClick={(event) => event.stopPropagation()}
          >
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
