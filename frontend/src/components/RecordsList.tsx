import { useEffect, useRef, useState } from 'react';
import type { SavedRecord } from '../types/record';

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
  onOpenForm: () => void;
  onSeed: () => void;
  isSeeding: boolean;
  activeUser: {
    username: string;
    role: 'admin' | 'user' | 'read-only';
  };
};

type TruncatedTextProps = {
  children: string;
  className?: string;
};

function TruncatedText({ children, className }: TruncatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;

    if (!element) {
      return;
    }

    const update = () => {
      setIsTruncated(element.scrollWidth > element.clientWidth);
    };

    update();

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(element);

    window.addEventListener('resize', update);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [children]);

  const showOnHover = (event: React.MouseEvent<HTMLSpanElement>) => {
    if (!isTruncated) {
      return;
    }

    setShowTooltip(true);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  const showOnFocus = () => {
    if (!isTruncated) {
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const rect = element.getBoundingClientRect();
    setTooltipPosition({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    setShowTooltip(true);
  };

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={showOnHover}
      onMouseMove={showOnHover}
      onMouseLeave={() => setShowTooltip(false)}
      onFocus={showOnFocus}
      onBlur={() => setShowTooltip(false)}
      tabIndex={0}
    >
      {children}
      {showTooltip && isTruncated ? (
        <span className="record-tooltip" style={{ left: tooltipPosition.x, top: tooltipPosition.y }}>
          {children}
        </span>
      ) : null}
    </span>
  );
}

function RecordsList({ records, deletedRecords, isLoading, error, onDelete, onRestore, onToggleView, showDeletedRecords, onEdit, onOpenForm, onSeed, isSeeding, activeUser }: RecordsListProps) {
  const visibleRecords = showDeletedRecords ? deletedRecords : records;
  const emptyMessage = showDeletedRecords
    ? 'No deleted records right now.'
    : 'No records yet. Submit the form to create the first one.';
  const listTitle = showDeletedRecords ? 'Deleted submissions' : 'Recent submissions';
  const listDescription = showDeletedRecords
    ? 'These records are still stored but hidden from the active list until restored.'
    : 'These are the records currently stored by the backend.';

  const isAdmin = activeUser.role === 'admin';

  const isReadOnly = activeUser.role === 'read-only';

  const canEditRecord = () =>
    activeUser.role === 'admin' ||
    activeUser.role === 'user';


  return (
    <section className="card list-card" aria-live="polite">
      <div className="card-header">
        <p className="eyebrow">Saved records</p>
        <h2>{listTitle}</h2>
        <p className="muted">{listDescription}</p>
      </div>

      <div className="record-list-actions">
        <span className="record-list-summary">{showDeletedRecords ? `${deletedRecords.length} deleted` : `${records.length} active`}</span>
        <div className="record-list-toolbar">

          {!isReadOnly && (
            <button
              type="button"
              className="primary-button"
              onClick={onOpenForm}
            >
              New submission
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              className="secondary-button"
              onClick={onSeed}
              disabled={isSeeding}
            >
              {isSeeding ? 'Seeding…' : 'Seed sample records'}
            </button>
          )}
          <button type="button" className="secondary-button" onClick={onToggleView} aria-pressed={showDeletedRecords}>
            {showDeletedRecords ? 'Show active records' : 'Show deleted records'}
          </button>
        </div>
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
        <>

          <div className="record-list-scroll">
            <ul className="record-list">
              {visibleRecords.map((record) => (
                <li key={record.id} className="record-item">
                  <div className="record-cell record-cell-name">
                    <TruncatedText className="record-item-text record-item-title">{record.name}</TruncatedText>
                  </div>
                  <div className="record-cell record-cell-email">
                    <TruncatedText className="record-item-text">{record.email}</TruncatedText>
                  </div>
                  <div className="record-cell record-cell-message">
                    <TruncatedText className="record-item-text">{record.message}</TruncatedText>
                  </div>

                  <div className="record-item-actions">
                    {canEditRecord() && (
                      <>
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => onEdit(record)}
                        >
                          Edit
                        </button>

                        {showDeletedRecords ? (
                          <button
                            type="button"
                            className="restore-button"
                            onClick={() => onRestore(record.id)}
                          >
                            Restore
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="delete-button"
                            onClick={() => onDelete(record.id)}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}

export default RecordsList;