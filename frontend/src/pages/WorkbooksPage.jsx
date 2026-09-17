import React, { useState, useEffect } from 'react';
import { Table2, Plus, ArrowRight, Trash2, Layers, Sparkles, Clock } from 'lucide-react';
import { api } from '../api/client';
import CustomSelect from '../components/CustomSelect';

export default function WorkbooksPage({ onOpenWorkbook }) {
  const [workbooks, setWorkbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [template, setTemplate] = useState('standard');

  const loadWorkbooks = async () => {
    try {
      setLoading(true);
      const data = await api.getWorkbooks();
      setWorkbooks(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkbooks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;

    let columns = undefined;
    if (template === 'hiring_intent') {
      columns = [
        { id: 'col_domain', label: 'Domain', type: 'lead_field', config: { field_name: 'domain' }, width: 180, editable: true },
        { id: 'col_company', label: 'Company', type: 'lead_field', config: { field_name: 'company' }, width: 180, editable: true },
        { id: 'col_jobs', label: 'Open Jobs', type: 'buying_signals', config: { endpoint: 'company-job-postings', input_domain: 'col_domain' }, width: 260, editable: false },
        { id: 'col_growth', label: 'Headcount Growth', type: 'buying_signals', config: { endpoint: 'company-headcount-growth', input_domain: 'col_domain' }, width: 220, editable: false },
        { id: 'col_dm', label: 'Decision Maker', type: 'decision_maker', config: { endpoint: 'people-rank-decision-makers', input_domain: 'col_domain' }, width: 240, editable: false },
      ];
    } else if (template === 'research') {
      columns = [
        { id: 'col_domain', label: 'Domain', type: 'lead_field', config: { field_name: 'domain' }, width: 180, editable: true },
        { id: 'col_research', label: 'Account Intel', type: 'research', config: { endpoint: 'research-web-answer', question: 'What is the core product and business model of {col_domain}?' }, width: 340, editable: false },
        { id: 'col_tech', label: 'Tech Stack', type: 'technographics', config: { endpoint: 'company-technographics', input_domain: 'col_domain' }, width: 220, editable: false },
        { id: 'col_funding', label: 'Funding', type: 'buying_signals', config: { endpoint: 'company-funding', input_domain: 'col_domain' }, width: 200, editable: false },
      ];
    }

    try {
      const created = await api.createWorkbook({
        name: newName.trim(),
        columns,
      });
      setShowModal(false);
      setNewName('');
      loadWorkbooks();
      onOpenWorkbook(created.id);
    } catch (err) {
      alert(`Error creating workbook: ${err.message}`);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workbook?')) return;
    try {
      await api.deleteWorkbook(id);
      loadWorkbooks();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const templateOptions = [
    { value: 'standard', label: 'Standard B2B Firmographics & Intent', description: 'Domain, Firmographics, Tech Stack, and Buying Signals' },
    { value: 'hiring_intent', label: 'Hiring & Headcount Growth Tracker', description: 'Tracks open roles, headcount velocity, and ranks buyers' },
    { value: 'research', label: 'Web Research Agent & Funding', description: 'Cited Exa research questions, tech stack, and funding history' },
  ];

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Workbooks
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            High-performance Clay-style spreadsheets powered by unified Muapi enrichment.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={15} />
          <span>New Workbook</span>
        </button>
      </div>

      {/* Grid of Workbooks */}
      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Loading workbooks...
        </div>
      ) : workbooks.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-card)',
            borderRadius: '8px',
            border: '1px dashed var(--border-strong)',
          }}
        >
          <Table2 size={36} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
            No workbooks yet
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Create your first Clay-style sheet to enrich companies and find decision makers.
          </p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={15} />
            <span>Create Workbook</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {workbooks.map((wb) => (
            <div
              key={wb.id}
              onClick={() => onOpenWorkbook(wb.id)}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-strong)';
                e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.backgroundColor = 'var(--bg-card)';
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--accent-soft)',
                        color: 'var(--accent-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Table2 size={16} />
                    </div>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {wb.name}
                    </span>
                  </div>
                  <button
                    className="btn-ghost"
                    onClick={(e) => handleDelete(wb.id, e)}
                    style={{ padding: '4px', borderRadius: '4px', color: 'var(--text-muted)' }}
                    title="Delete workbook"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <span>{wb.lead_count} rows</span>
                  <span>•</span>
                  <span>{wb.columns_count} columns</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {wb.updated_at ? new Date(wb.updated_at).toLocaleDateString() : 'Just now'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent-primary)', fontWeight: 500 }}>
                  Open sheet <ArrowRight size={13} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Workbook Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Create New Workbook
            </h2>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Workbook Name
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Enterprise SaaS Outbound Q1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Template Preset
                </label>
                <CustomSelect
                  value={template}
                  onChange={setTemplate}
                  options={templateOptions}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create & Open
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
