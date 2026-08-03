import type { SavedRecord } from "../types/record";

type RecordsListProps = {
  records: SavedRecord[];
  isLoading: boolean;
  error: string | null;
  onDelete: (id: number) => void
};

function RecordsList({ records, isLoading, error, onDelete }: RecordsListProps) {
  return (
    <section className="card list-card" aria-live="polite">
      <div className="card-header">
        <p className="eyebrow">Saved records</p>
        <h2>Recent submissions</h2>
        <p className="muted">
          These are the records currently stored by the backend.
        </p>
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
      ) : records.length === 0 ? (
        <p className="status">
          No records yet. Submit the form to create the first one.
        </p>
      ) : (
        <ul className="record-list">
          {records.map((record) => (
            <li key={record.id} className="record-item">
              <span>{record.name}</span>
              <span>{record.email}</span>
              <span>{record.message}</span>

              <button
                className="delete-button"
                onClick={() => onDelete(record.id)}
              >
                Delete
                </button>              
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecordsList;
