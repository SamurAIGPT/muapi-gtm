import React, { useState, useEffect } from 'react';
import { Zap, Plus, Play, Trash2, ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { api } from '../api/client';
import CustomSelect from '../components/CustomSelect';

export default function AutomationsPage() {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('new_signal');
  const [actionType, setActionType] = useState('find_decision_maker');

  const loadAutomations = async () => {
    try {
      setLoading(true);
      const data = await api.getAutomations();
      setAutomations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAutomations();
  }, []);

  const handleToggle = async (id) => {
    try {
      await api.toggleAutomation(id);
      loadAutomations();
    } catch (e) {
      alert(`Error toggling automation: ${e.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this automation?')) return;
    try {
      await api.deleteAutomation(id);
      loadAutomations();
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.createAutomation({
        name: name.trim(),
        trigger_type: triggerType,
        action_type: actionType,
      });
      setShowModal(false);
      setName('');
      loadAutomations();
    } catch (e) {
      alert(`Error creating automation: ${e.message}`);
    }
  };

  const triggerOptions = [
    { value: 'new_signal', label: 'When a new Buying Signal is detected', description: 'Triggers on hiring surge, funding, or tech stack addition' },
    { value: 'row_enriched', label: 'When a Workbook Row finishes enrichment', description: 'Triggers after initial firmographic or people lookup' },
    { value: 'score_threshold', label: 'When ICP Fit Score exceeds 80%', description: 'Triggers only for high-value qualified accounts' },
  ];

  const actionOptions = [
    { value: 'find_decision_maker', label: 'Find & Rank Decision Makers (/people-rank-decision-makers)', description: 'Automatically discovers executive contacts' },
    { value: 'generate_outreach', label: 'Generate 1-to-1 Cold Email & Voice Greeting', description: 'Generates outbound copy and audio note' },
    { value: 'export_webhook', label: 'Push to Webhook / CRM Destination', description: 'Syncs lead to HubSpot, Smartlead, or Instantly' },
  ];

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Event-Driven Automations
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Autonomously trigger enrichment, decision-maker lookups, and outreach generation when buying signals occur.
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          <span>New Automation</span>
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading automations...
        </div>
      ) : automations.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Zap size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No automations configured
          </div>
          <div style={{ fontSize: '12px' }}>
            Build automated rules to react in real-time to prospect hiring spikes and funding.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {automations.map((a) => (
            <div
              key={a.id}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: a.is_active ? 'var(--accent-soft)' : 'rgba(255, 255, 255, 0.03)',
                    color: a.is_active ? 'var(--accent-primary)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Zap size={18} />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {a.name}
                    </span>
                    <span className={a.is_active ? 'badge badge-success' : 'badge badge-gray'}>
                      {a.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {a.description || 'Custom trigger rule'}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span style={{ padding: '2px 6px', backgroundColor: 'var(--bg-input)', borderRadius: '4px' }}>
                      IF: {a.trigger_type}
                    </span>
                    <ArrowRight size={10} />
                    <span style={{ padding: '2px 6px', backgroundColor: 'var(--bg-input)', borderRadius: '4px' }}>
                      THEN: {a.action_type}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  className={a.is_active ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm'}
                  onClick={() => handleToggle(a.id)}
                >
                  {a.is_active ? 'Pause' : 'Activate'}
                </button>
                <button className="btn-ghost" onClick={() => handleDelete(a.id)} style={{ padding: '6px' }}>
                  <Trash2 size={14} style={{ color: 'var(--text-muted)' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Automation Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Create New Automation Rule
            </h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Rule Name
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Enrich Series B Companies Automatically"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Trigger Condition (WHEN)
                </label>
                <CustomSelect
                  value={triggerType}
                  onChange={setTriggerType}
                  options={triggerOptions}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Action to Execute (THEN)
                </label>
                <CustomSelect
                  value={actionType}
                  onChange={setActionType}
                  options={actionOptions}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
