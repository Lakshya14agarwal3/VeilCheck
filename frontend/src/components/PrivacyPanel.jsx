import React from 'react';

export default function PrivacyPanel({ result }) {
  if (!result) return null;

  const { ciphertext_bytes, ciphertext_preview, timings_ms } = result;
  const totalTiming = (
    (timings_ms?.encrypt || 0) +
    (timings_ms?.server || 0) +
    (timings_ms?.decrypt || 0)
  ).toFixed(2);

  return (
    <div className="card privacy-card">
      <div className="card-header">
        <h2>What the server saw</h2>
        <span className="badge badge-neutral">Encrypted CKKS Payload</span>
      </div>

      <p className="privacy-explanation">
        The server processed only encrypted ciphertext; it never saw your raw clinical values or secret decryption key.
      </p>

      <div className="privacy-grid">
        <div className="privacy-stat">
          <span className="stat-label">Ciphertext Size</span>
          <span className="stat-value font-mono">
            {ciphertext_bytes ? `${ciphertext_bytes.toLocaleString()} bytes` : 'N/A'}
          </span>
        </div>

        <div className="privacy-stat">
          <span className="stat-label">Ciphertext Preview (First 32 hex chars)</span>
          <span className="stat-value font-mono hex-preview" title="First 32 hex characters of serialized ciphertext">
            {ciphertext_preview || 'N/A'}...
          </span>
        </div>
      </div>

      <div className="timings-section">
        <h3>Execution Timings</h3>
        <div className="timings-grid">
          <div className="timing-box">
            <span className="timing-name">1. Local Encrypt</span>
            <span className="timing-val font-mono">{timings_ms?.encrypt ?? 0} ms</span>
            <span className="timing-desc">Proxy (Secret Key)</span>
          </div>

          <div className="timing-box">
            <span className="timing-name">2. Server Inference</span>
            <span className="timing-val font-mono">{timings_ms?.server ?? 0} ms</span>
            <span className="timing-desc">Homomorphic MatMul</span>
          </div>

          <div className="timing-box">
            <span className="timing-name">3. Local Decrypt</span>
            <span className="timing-val font-mono">{timings_ms?.decrypt ?? 0} ms</span>
            <span className="timing-desc">Proxy (Secret Key)</span>
          </div>

          <div className="timing-box highlight-timing">
            <span className="timing-name">Total Roundtrip</span>
            <span className="timing-val font-mono">{totalTiming} ms</span>
            <span className="timing-desc">End-to-end</span>
          </div>
        </div>
      </div>
    </div>
  );
}

