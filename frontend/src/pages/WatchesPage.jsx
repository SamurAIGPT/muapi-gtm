import React, { useState, useEffect } from 'react';
import {
  Radar,
  Plus,
  RefreshCw,
  Globe,
  Trash2,
  TrendingUp,
  Briefcase,
  DollarSign,
  Newspaper,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';

export default function WatchesPage() {
  const [watches, setWatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  // New Watch Modal
  const [showModal, setShowModal] = useState(false);
  const [domain, setDomain] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWatches();
  }, []);

  const loadWatches = async () => {
    setLoading(true);
    try {
      const data = await api.getWatches();
      setWatches(data);
    } catch (err) {
      console.error('Failed to load watches:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!domain.trim()) return;
    setSaving(true);
    try {
      await api.createWatch({
        domain: domain.trim(),
        company_name: companyName.trim() || undefined,
        watch_types: ['news', 'funding', 'hiring'],
        check_interval_hours: 12,
      });
      setShowModal(false);
      setDomain('');
      setCompanyName('');
      await loadWatches();
    } catch (err) {
      alert('Error creating watch: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleScan = async (id) => {
    setScanningId(id);
    setScanResult(null);
    try {
      const res = await api.scanWatch(id);
      setScanResult(res);
      await loadWatches();
    } catch (err) {
      alert('Scan error: ' + err.message);
    } finally {
      setScanningId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this account watch?')) return;
    try {
      await api.deleteWatch(id);
      await loadWatches();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <header
        style={{
          padding: '24px 32px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Account Watches & Intent Radar
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '10px' }}>
              Real-Time Domain Watch
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Continuously monitor target enterprise accounts for hiring surges, funding rounds, and technographic triggers.
          </p>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} />
          <span>Add Domain Watch</span>
        </button>
      </header>

      {/* Main Container */}
      <div style={{ padding: '24px 32px' }}>
        {/* Scan Feedback Banner */}
        {scanResult && (
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '8px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--success)' }}>
              <CheckCircle2 size={16} />
              <span>
                Scanned <strong>{scanResult.domain}</strong>: Found {scanResult.signals_found} live intent signals via Muapi!
              </span>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setScanResult(null)}
              style={{ fontSize: '11px', color: 'var(--text-muted)' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Watches Grid */}
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading monitored domains...
          </div>
        ) : watches.length === 0 ? (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              backgroundColor: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '8px',
            }}
          >
            <Radar size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No accounts monitored yet
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px' }}>
              Add enterprise target accounts (e.g. stripe.com, datadog.com) to automatically scan for expansion signals and hiring spikes.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
              <Plus size={14} />
              <span>Add Your First Watch</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '16px' }}>
            {watches.map((w) => (
              <div
                key={w.id}
                style={{
                  padding: '18px 20px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Globe size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {w.company_name}
                      </span>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>
                      Active Watch
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--accent-primary)', fontFamily: 'monospace', marginBottom: '10px' }}>
                    {w.domain}
                  </div>

                  {/* Monitored Triggers */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      <Newspaper size={11} /> News Intent
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      <DollarSign size={11} /> Funding
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                      <Briefcase size={11} /> Hiring Spikes
                    </span>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{w.signals_detected_count || 0} signals caught</span> · <span>Every {w.check_interval_hours}h</span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleScan(w.id)}
                    disabled={scanningId === w.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={12} className={scanningId === w.id ? 'animate-spin' : ''} />
                    <span>{scanningId === w.id ? 'Scanning Muapi...' : 'Scan Now'}</span>
                  </button>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(w.id)}
                    style={{ color: 'var(--danger)' }}
                    title="Delete watch"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Watch Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ width: '420px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Add Domain Watch
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Continuously monitor a company domain for intent spikes and expansion news.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Target Domain *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. stripe.com or datadog.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Company Name (Optional)
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Stripe"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Adding...' : 'Start Watching'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
