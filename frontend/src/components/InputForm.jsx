import React, { useState } from 'react';

const SAMPLES = {
  normal: { hba1c: '5.2', fbg: '92', ogtt: '115', insulin: '45' },
  elevated: { hba1c: '7.8', fbg: '165', ogtt: '210', insulin: '180' },
};

export default function InputForm({ onSubmit, loading, disabled }) {
  const [values, setValues] = useState({
    hba1c: '',
    fbg: '',
    ogtt: '',
    insulin: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (field, val) => {
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const loadSample = (type) => {
    setValues(SAMPLES[type]);
    setErrors({});
  };

  const validate = () => {
    const newErrors = {};
    const fields = [
      { key: 'hba1c', label: 'HbA1c' },
      { key: 'fbg', label: 'Fasting glucose' },
      { key: 'ogtt', label: 'Post-meal glucose' },
      { key: 'insulin', label: 'Insulin' },
    ];

    fields.forEach(({ key, label }) => {
      const raw = values[key];
      if (raw === undefined || raw === null || String(raw).trim() === '') {
        newErrors[key] = `${label} is required.`;
      } else {
        const num = parseFloat(raw);
        if (isNaN(num)) {
          newErrors[key] = `${label} must be a valid number.`;
        } else if (num <= 0) {
          newErrors[key] = `${label} must be a positive number (> 0).`;
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const numericValues = [
      parseFloat(values.hba1c),
      parseFloat(values.fbg),
      parseFloat(values.ogtt),
      parseFloat(values.insulin),
    ];
    onSubmit(numericValues);
  };

  return (
    <form className="card form-card" onSubmit={handleSubmit} noValidate>
      <div className="card-header">
        <h2>Enter Clinical Values</h2>
        <div className="sample-buttons">
          <span className="sample-label">Fill sample:</span>
          <button
            type="button"
            className="btn-sample"
            onClick={() => loadSample('normal')}
            disabled={loading || disabled}
          >
            Normal
          </button>
          <button
            type="button"
            className="btn-sample"
            onClick={() => loadSample('elevated')}
            disabled={loading || disabled}
          >
            Elevated
          </button>
        </div>
      </div>

      <div className="form-grid">
        {/* HbA1c */}
        <div className={`form-group ${errors.hba1c ? 'has-error' : ''}`}>
          <label htmlFor="hba1c">
            <span className="label-text">HbA1c</span>
            <span className="unit-badge">%</span>
          </label>
          <input
            id="hba1c"
            type="number"
            step="0.1"
            min="0"
            placeholder="e.g. 5.6"
            value={values.hba1c}
            onChange={(e) => handleChange('hba1c', e.target.value)}
            disabled={loading || disabled}
          />
          {errors.hba1c && <span className="field-error">{errors.hba1c}</span>}
        </div>

        {/* Fasting glucose */}
        <div className={`form-group ${errors.fbg ? 'has-error' : ''}`}>
          <label htmlFor="fbg">
            <span className="label-text">Fasting glucose</span>
            <span className="unit-badge">mg/dL</span>
          </label>
          <input
            id="fbg"
            type="number"
            step="1"
            min="0"
            placeholder="e.g. 95"
            value={values.fbg}
            onChange={(e) => handleChange('fbg', e.target.value)}
            disabled={loading || disabled}
          />
          {errors.fbg && <span className="field-error">{errors.fbg}</span>}
        </div>

        {/* Post-meal glucose */}
        <div className={`form-group ${errors.ogtt ? 'has-error' : ''}`}>
          <label htmlFor="ogtt">
            <span className="label-text">Post-meal glucose</span>
            <span className="unit-badge">mg/dL</span>
          </label>
          <input
            id="ogtt"
            type="number"
            step="1"
            min="0"
            placeholder="e.g. 130"
            value={values.ogtt}
            onChange={(e) => handleChange('ogtt', e.target.value)}
            disabled={loading || disabled}
          />
          {errors.ogtt && <span className="field-error">{errors.ogtt}</span>}
        </div>

        {/* Insulin */}
        <div className={`form-group ${errors.insulin ? 'has-error' : ''}`}>
          <label htmlFor="insulin">
            <span className="label-text">Insulin</span>
            <span className="unit-badge">µU/mL</span>
          </label>
          <input
            id="insulin"
            type="number"
            step="1"
            min="0"
            placeholder="e.g. 60"
            value={values.insulin}
            onChange={(e) => handleChange('insulin', e.target.value)}
            disabled={loading || disabled}
          />
          {errors.insulin && <span className="field-error">{errors.insulin}</span>}
        </div>
      </div>

      <div className="form-actions">
        <button
          type="submit"
          className="btn-submit"
          disabled={loading || disabled}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="spinner"></span>
              Encrypting and computing...
            </span>
          ) : (
            'Predict privately'
          )}
        </button>

        {loading && (
          <p className="loading-hint">
            The first prediction generates CKKS homomorphic encryption keys and synchronizes context with the server, which can take several seconds.
          </p>
        )}
      </div>
    </form>
  );
}

