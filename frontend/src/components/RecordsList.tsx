import type { SavedRecord } from "../types/record";

type RecordsListProps = {
  records: SavedRecord[];
  deletedRecords: SavedRecord[];
  isLoading: boolean;
  error: string | null;
  onDelete: (id: number) => void;
  onRestore: (id: number) => void;
  onToggleView: () => void;
  showDeletedRecords: boolean;
  onEdit: (record: SavedRecord) => void;
};

function RecordsList({ records, deletedRecords, isLoading, error, onDelete, onRestore, onEdit, onToggleView, showDeletedRecords }: RecordsListProps) {
  const visibleRecords = showDeletedRecords ? deletedRecords : records;
  const emptyMessage = showDeletedRecords
    ? 'No deleted records right now.'
    : 'No records yet. Submit the form to create the first one.';
  const listTitle = showDeletedRecords ? 'Deleted submissions' : 'Recent submissions';
  const listDescription = showDeletedRecords
    ? 'These records are still stored but hidden from the active list until restored.'
    : 'These are the records currently stored by the backend.';

  return (
    <section className="card list-card" aria-live="polite">
      <div className="card-header">
        <p className="eyebrow">Saved records</p>
        <h2>{listTitle}</h2>
        <p className="muted">{listDescription}</p>
      </div>

      <div className="record-list-actions">
        <span className="record-list-summary">{showDeletedRecords ? `${deletedRecords.length} deleted` : `${records.length} active`}</span>
        <button type="button" className="secondary-button" onClick={onToggleView} aria-pressed={showDeletedRecords}>
          {showDeletedRecords ? 'Show active records' : 'Show deleted records'}
        </button>
      </div>

      <div className="record-list-header">
        <span>Name</span>
        <span>Email</span>
        <span>Message</span>
        <span>Actions</span>
      </div>

      {isLoading ? (
        <p className="status">Loading records...</p>
      ) : error ? (
        <p className="status error">{error}</p>
      ) : visibleRecords.length === 0 ? (
        <p className="status">{emptyMessage}</p>
      ) : (
        <ul className="record-list">
          {visibleRecords.map((record) => (
            <li key={record.id} className="record-item">
              <div className="record-item-main">
                <strong>{record.name}</strong>
                <p>{record.email}</p>
                <p>{record.message}</p>
              </div>

              <div className="record-item-actions">
                {showDeletedRecords ? (
                  <button type="button" className="restore-button" onClick={() => onRestore(record.id)}>
                    Restore
                  </button>
                ) : (
                  <>
                  <button type= "button" className="edit_button" onClick={() => onEdit(record)}>
                    Edit
                  </button>
                  <button type="button" className="delete-button" onClick={() => onDelete(record.id)}>
                    Delete
                  </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecordsList;
