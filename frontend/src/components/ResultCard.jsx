import React from 'react';

export default function ResultCard({ result, info }) {
  if (!result) return null;

  const isDiabetic = result.label === 'diabetic';
  const percentage = (result.probability * 100).toFixed(1);
  const accuracyStr =
    info && typeof info.accuracy === 'number'
      ? `${(info.accuracy * 100).toFixed(1)}%`
      : 'N/A';

  return (
    <div className={`card result-card ${isDiabetic ? 'status-diabetic' : 'status-non-diabetic'}`}>
      <div className="card-header">
        <h2>Prediction Result</h2>
        <span className={`badge ${isDiabetic ? 'badge-danger' : 'badge-success'}`}>
          {result.label}
        </span>
      </div>

      <div className="result-main">
        <div className="result-metric">
          <div className="metric-label">Estimated Risk Probability</div>
          <div className="metric-value">{percentage}%</div>
          <div className="metric-bar-container">
            <div
              className={`metric-bar-fill ${isDiabetic ? 'fill-danger' : 'fill-success'}`}
              style={{ width: `${Math.min(Math.max(result.probability * 100, 2), 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="result-details-grid">
          <div className="detail-item">
            <span className="detail-label">Classification</span>
            <span className="detail-val capitalize">{result.label}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Model Accuracy</span>
            <span className="detail-val">{accuracyStr}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">Raw Logit Score</span>
            <span className="detail-val font-mono">{typeof result.logit === 'number' ? result.logit.toFixed(4) : result.logit}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

