import React, { useEffect, useState } from 'react';
import InputForm from './components/InputForm';
import ResultCard from './components/ResultCard';
import PrivacyPanel from './components/PrivacyPanel';

export default function App() {
  const [info, setInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [serviceError, setServiceError] = useState(null);

  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState(null);
  const [result, setResult] = useState(null);

  const fetchInfo = async () => {
    setInfoLoading(true);
    setServiceError(null);
    try {
      const res = await fetch('/api/info');
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Server responded with status code ${res.status}`
        );
      }
      const data = await res.json();
      setInfo(data);
      setServiceError(null);
    } catch (err) {
      console.error('Failed to connect to backend:', err);
      setServiceError(
        'Unable to communicate with the VeilCheck backend. Please ensure both server.py (port 8000) and proxy.py (port 8001) are active.'
      );
    } finally {
      setInfoLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
  }, []);

  const handlePredict = async (values) => {
    setPredictLoading(true);
    setPredictError(null);

    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || `Prediction failed with status ${res.status}`
        );
      }

      const data = await res.json();
      setResult(data);
      setPredictError(null);
    } catch (err) {
      console.error('Prediction failed:', err);
      setPredictError(
        err.message || 'An unexpected error occurred during prediction.'
      );
    } finally {
      setPredictLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-inner">
          <div className="brand">
            <span className="brand-logo" aria-hidden="true">🛡️</span>
            <div>
              <h1 className="brand-title">VeilCheck</h1>
              <p className="brand-tagline">
                Zero-Knowledge Diabetes Risk Assessment via Homomorphic Encryption (CKKS)
              </p>
            </div>
          </div>
          <div className="flow-badge">
            <span className="node">Browser (:5173)</span>
            <span className="arrow">→</span>
            <span className="node secure">Proxy (:8001)</span>
            <span className="arrow">→</span>
            <span className="node encrypted">Server (:8000)</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Backend service down / error banner */}
        {serviceError && (
          <div className="alert alert-error" role="alert">
            <div className="alert-content">
              <strong>Backend Offline:</strong> {serviceError}
            </div>
            <button
              type="button"
              className="btn-retry"
              onClick={fetchInfo}
              disabled={infoLoading}
            >
              {infoLoading ? 'Connecting...' : 'Retry Connection'}
            </button>
          </div>
        )}

        {/* Prediction error alert */}
        {predictError && (
          <div className="alert alert-warning" role="alert">
            <div className="alert-content">
              <strong>Prediction Error:</strong> {predictError}
            </div>
          </div>
        )}

        {/* Input Form */}
        <InputForm
          onSubmit={handlePredict}
          loading={predictLoading}
          disabled={Boolean(serviceError && !info)}
        />

        {/* Prediction Result */}
        {result && <ResultCard result={result} info={info} />}

        {/* Privacy Panel */}
        {result && <PrivacyPanel result={result} />}

        {/* Architecture info */}
        <section className="card arch-card">
          <div className="card-header">
            <h3>How privacy is preserved</h3>
          </div>
          <div className="arch-flow">
            <div className="arch-step">
              <span className="step-num">1</span>
              <div>
                <strong>Local Proxy Encrypts</strong>
                <p>The client proxy holds your private key. Raw values are standardized and sealed into a CKKS encrypted vector.</p>
              </div>
            </div>
            <div className="arch-step">
              <span className="step-num">2</span>
              <div>
                <strong>Server Evaluates Blindly</strong>
                <p>The server runs linear model matrix multiplication directly on ciphertexts without ever decrypting them.</p>
              </div>
            </div>
            <div className="arch-step">
              <span className="step-num">3</span>
              <div>
                <strong>Local Proxy Decrypts</strong>
                <p>The encrypted logit is decrypted locally by the proxy, converted to a probability, and rendered in the browser.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="disclaimer-banner">
          <strong>Medical Disclaimer:</strong> This application is a technical demonstration of homomorphic encryption using a synthetic dataset. It is strictly for demonstration purposes and must NOT be used for medical diagnosis, clinical evaluation, or healthcare decisions.
        </div>
      </footer>
    </div>
  );
}

