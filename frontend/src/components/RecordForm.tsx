import type { FormEvent } from 'react';
import type { RecordSubmission } from '../types/record';

type RecordFormProps = {
  values: RecordSubmission;
  errors: Partial<Record<keyof RecordSubmission, string>>;
  isSubmitting: boolean;
  onChange: (field: keyof RecordSubmission, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function RecordForm({ values, errors, isSubmitting, onChange, onSubmit }: RecordFormProps) {
  return (
    <form className="card form-card" onSubmit={onSubmit} noValidate>
      <div className="card-header">
        <p className="eyebrow">Submission form</p>
        <h2>Share a critical update</h2>
        <p className="muted">Submit a record and it will be saved through the API.</p>
      </div>

      <label className="field">
        <span>Name</span>
        <input
          type="text"
          value={values.name}
          onChange={(event) => onChange('name', event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name ? <small id="name-error">{errors.name}</small> : null}
      </label>

      <label>
        Owner
        <input
          value={values.owner}
          onChange={("owner", e.target.value)
          }
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          value={values.email}
          onChange={(event) => onChange('email', event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email ? <small id="email-error">{errors.email}</small> : null}
      </label>

      <label className="field">
        <span>Message</span>
        <textarea
          rows={5}
          value={values.message}
          onChange={(event) => onChange('message', event.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {errors.message ? <small id="message-error">{errors.message}</small> : null}
      </label>

      <button className="primary-button" type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : 'Submit record'}
      </button>
    </form>
  );
}

export default RecordForm;
