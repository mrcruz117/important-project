import type { SavedRecord } from '../types/record';

type RecordsListProps = {
  records: SavedRecord[];
  isLoading: boolean;
  error: string | null;
};

function RecordsList({ records, isLoading, error }: RecordsListProps) {
  return (
    <section className="card list-card" aria-live="polite">
      <div className="card-header">
        <p className="eyebrow">Saved records</p>
        <h2>Recent submissions</h2>
        <p className="muted">These are the records currently stored by the backend.</p>
      </div>

      {isLoading ? (
        <p className="status">Loading records...</p>
      ) : error ? (
        <p className="status error">{error}</p>
      ) : records.length === 0 ? (
        <p className="status">No records yet. Submit the form to create the first one.</p>
      ) : (
        <ul className="record-list">
          {records.map((record) => (
            <li key={record.id} className="record-item">
              <div>
                <strong>{record.name}</strong>
                <p>{record.email}</p>
              </div>
              <p className="message">{record.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RecordsList;
