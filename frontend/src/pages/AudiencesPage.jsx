import React, { useState, useEffect } from 'react';
import {
  ListFilter,
  Plus,
  RefreshCw,
  Send,
  Building2,
  Users,
  CheckCircle2,
  Trash2,
  Filter,
  ArrowRight,
  Sparkles,
  Layers,
  ChevronDown,
} from 'lucide-react';
import { api } from '../api/client';

export default function AudiencesPage() {
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudience, setSelectedAudience] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [refreshingId, setRefreshingId] = useState(null);

  // New Audience Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [industry, setIndustry] = useState('');
  const [techStack, setTechStack] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAudiences();
  }, []);

  const loadAudiences = async () => {
    setLoading(true);
    try {
      const data = await api.getAudiences();
      setAudiences(data);
      if (data.length > 0 && !selectedAudience) {
        selectAudience(data[0]);
      }
    } catch (err) {
      console.error('Failed to load audiences:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectAudience = async (aud) => {
    setSelectedAudience(aud);
    try {
      const detail = await api.getAudience(aud.id);
      setSelectedDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const filters = [];
      if (industry.trim()) filters.push({ field: 'industry', op: 'contains', val: industry.trim() });
      if (techStack.trim()) filters.push({ field: 'tech_stack', op: 'includes', val: techStack.trim() });

      const destinations = [];
      if (webhookUrl.trim()) destinations.push({ type: 'webhook', url: webhookUrl.trim() });

      const created = await api.createAudience({
        name: name.trim(),
        description: description.trim() || undefined,
        filters,
        destinations,
      });

      setShowModal(false);
      setName('');
      setDescription('');
      setIndustry('');
      setTechStack('');
      setWebhookUrl('');
      await loadAudiences();
      selectAudience(created);
    } catch (err) {
      alert('Error creating audience: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async (id) => {
    setRefreshingId(id);
    try {
      const res = await api.refreshAudience(id);
      await loadAudiences();
      if (selectedAudience && selectedAudience.id === id) {
        selectAudience({ ...selectedAudience, member_count: res.member_count });
      }
    } catch (err) {
      alert('Error refreshing: ' + err.message);
    } finally {
      setRefreshingId(null);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this audience?')) return;
    try {
      await api.deleteAudience(id);
      setSelectedAudience(null);
      setSelectedDetail(null);
      await loadAudiences();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <header
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-card)',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h1 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Dynamic Audiences & Activation
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '10px' }}>
              ICP Segment Builder
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Filter accounts by firmographics, technographics, and intent triggers for instant sync to webhooks and sequencers.
          </p>
        </div>

        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <Plus size={14} />
          <span>New Audience</span>
        </button>
      </header>

      {/* Main Content Split Pane */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Audiences List (Left) */}
        <div
          style={{
            width: '320px',
            borderRight: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-primary)',
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
            Target Segments ({audiences.length})
          </div>

          {loading ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              Loading audiences...
            </div>
          ) : audiences.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
              <ListFilter size={24} style={{ color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>No audiences yet</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Create a segment to auto-sync enriched accounts.
              </div>
            </div>
          ) : (
            audiences.map((aud) => {
              const isSelected = selectedAudience?.id === aud.id;
              return (
                <div
                  key={aud.id}
                  onClick={() => selectAudience(aud)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--bg-card)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {aud.name}
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>
                      {aud.member_count} accounts
                    </span>
                  </div>

                  {aud.description && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.4' }}>
                      {aud.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>{aud.filters?.length || 0} filters active</span>
                    <span>Every {aud.refresh_interval_hours}h</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Audience Details (Right) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', backgroundColor: 'var(--bg-primary)' }}>
          {selectedAudience ? (
            <div>
              {/* Audience Banner */}
              <div
                style={{
                  padding: '20px 24px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {selectedAudience.name}
                    </h2>
                    <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                      {selectedAudience.member_count} Enriched Accounts
                    </span>
                  </div>
                  {selectedAudience.description && (
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {selectedAudience.description}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleRefresh(selectedAudience.id)}
                    disabled={refreshingId === selectedAudience.id}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RefreshCw size={13} className={refreshingId === selectedAudience.id ? 'animate-spin' : ''} />
                    <span>{refreshingId === selectedAudience.id ? 'Syncing...' : 'Sync Now'}</span>
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => handleDelete(selectedAudience.id)}
                    style={{ color: 'var(--danger)' }}
                    title="Delete audience"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Segment Rules & Filter Matrix */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Filter size={13} style={{ color: 'var(--accent-primary)' }} />
                    <span>Dynamic Filter Criteria</span>
                  </div>
                  {selectedAudience.filters && selectedAudience.filters.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedAudience.filters.map((f, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 500 }}>{f.field}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{f.op}</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>"{f.val}"</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No filters applied (All accounts included)</div>
                  )}
                </div>

                <div style={{ padding: '16px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Send size={13} style={{ color: '#10b981' }} />
                    <span>Activation Destinations</span>
                  </div>
                  {selectedAudience.destinations && selectedAudience.destinations.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {selectedAudience.destinations.map((d, i) => (
                        <div
                          key={i}
                          style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-input)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.type.toUpperCase()}</span>
                          <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: '11px' }}>{d.url || 'Configured'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No live export webhook configured.</div>
                  )}
                </div>
              </div>

              {/* Matching Accounts Table */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Matching Member Accounts
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Sample preview (Live matching)
                  </span>
                </div>

                {selectedDetail?.members && selectedDetail.members.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)' }}>Company</th>
                        <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)' }}>Domain</th>
                        <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)' }}>Industry</th>
                        <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)' }}>Key Contact</th>
                        <th style={{ textAlign: 'left', padding: '10px 16px', color: 'var(--text-secondary)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedDetail.members.map((m, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                            {m.company_name || 'Account'}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                            {m.domain || '—'}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>
                            {m.industry || 'Technology'}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>
                            {m.contact_name ? `${m.contact_name} (${m.contact_email || 'Verified'})` : 'Enriched'}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span className="badge badge-success" style={{ fontSize: '10px' }}>
                              Qualified
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No accounts currently match the filter criteria. Add accounts to workbooks to populate this audience.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Select an audience on the left to inspect criteria and member accounts.
            </div>
          )}
        </div>
      </div>

      {/* Create Audience Modal */}
      {showModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ width: '480px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
              Create Target Audience
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Define rule criteria to automatically segment qualifying pipeline records.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Audience Name *
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Series A+ Fintech using React"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Description
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. High-velocity accounts with recent expansion signals"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Industry Filter (Contains)
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Financial Services, SaaS, Healthcare"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Tech Stack Requirement
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. React, AWS, Segment"
                  value={techStack}
                  onChange={(e) => setTechStack(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Webhook Sync URL (Optional)
                </label>
                <input
                  type="url"
                  className="input-text"
                  placeholder="https://hooks.zapier.com/... or Smartlead webhook"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
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
                  {saving ? 'Creating...' : 'Create Audience'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
