import React, { useState, useEffect } from 'react';
import { Activity, Plus, Search, TrendingUp, DollarSign, Briefcase, Layers, CheckCircle2, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import CustomSelect from '../components/CustomSelect';

const SIGNAL_ICONS = {
  hiring_spike: <Briefcase size={14} style={{ color: '#60a5fa' }} />,
  hiring_expansion: <Briefcase size={14} style={{ color: '#60a5fa' }} />,
  funding_round: <DollarSign size={14} style={{ color: '#34d399' }} />,
  tech_change: <Layers size={14} style={{ color: '#a78bfa' }} />,
  market_expansion: <TrendingUp size={14} style={{ color: '#f59e0b' }} />,
};

export default function SignalsPage() {
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanDomain, setScanDomain] = useState('');
  const [scanning, setScanning] = useState(false);

  const loadSignals = async () => {
    try {
      setLoading(true);
      const data = await api.getSignals();
      setSignals(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
  }, []);

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanDomain.trim()) return;
    try {
      setScanning(true);
      await api.scanDomain(scanDomain.trim());
      setShowScanModal(false);
      setScanDomain('');
      loadSignals();
    } catch (err) {
      alert(`Scan failed: ${err.message}`);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Buying Signals & Intent Timeline
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time intent watches tracking hiring spikes, funding announcements, and technology changes.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowScanModal(true)}>
          <RefreshCw size={14} />
          <span>Scan Domain Signals</span>
        </button>
      </div>

      {/* Signals Timeline */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading signals...
        </div>
      ) : signals.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Activity size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No signals active
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Click 'Scan Domain Signals' to run intent detection on target accounts.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {signals.map((s) => (
            <div
              key={s.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {SIGNAL_ICONS[s.signal_type] || <Activity size={15} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {s.company_name || s.domain}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({s.domain})
                    </span>
                    <span className="badge badge-indigo" style={{ textTransform: 'capitalize' }}>
                      {s.signal_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {s.title}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Confidence</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--success)' }}>
                    {Math.round((s.confidence || 0.9) * 100)}%
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {s.detected_at ? new Date(s.detected_at).toLocaleDateString() : 'Today'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scan Modal */}
      {showScanModal && (
        <div className="modal-backdrop" onClick={() => setShowScanModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Scan Company Buying Signals
            </h2>
            <form onSubmit={handleScanSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Website Domain
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. datadoghq.com, stripe.com, figma.com"
                  value={scanDomain}
                  onChange={(e) => setScanDomain(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                This runs live intent analysis across hiring surges (/company-job-postings), recent capital rounds (/company-funding), and intent indicators (/company-buying-signals).
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowScanModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={scanning}>
                  {scanning ? 'Scanning...' : 'Start Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
