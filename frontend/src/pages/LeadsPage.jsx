import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, ExternalLink, Mail, Building, Plus } from 'lucide-react';
import { api } from '../api/client';
import CustomSelect from '../components/CustomSelect';

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await api.getLeads(search, statusFilter === 'all' ? '' : statusFilter);
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [search, statusFilter]);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'new', label: 'New Lead' },
    { value: 'qualified', label: 'Qualified ICP' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'replied', label: 'Replied' },
  ];

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
            Global Leads Database
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Consolidated B2B accounts, decision makers, and verified contact profiles.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-text"
            placeholder="Search by company, domain, or contact..."
            style={{ paddingLeft: '34px' }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ width: '180px' }}>
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            size="sm"
          />
        </div>
      </div>

      {/* Leads Table */}
      <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr', padding: '10px 16px', backgroundColor: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <div>Company & Domain</div>
          <div>Primary Decision Maker</div>
          <div>Contact Email</div>
          <div>Industry</div>
          <div>Status</div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
              No leads found
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Enrich workbook rows to populate your global leads directory.
            </div>
          </div>
        ) : (
          leads.map((l) => (
            <div
              key={l.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr',
                padding: '12px 16px',
                borderBottom: '1px solid var(--border-subtle)',
                fontSize: '13px',
                alignItems: 'center',
                transition: 'background-color 0.1s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div>
                <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                  {l.company_name || l.domain}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {l.domain}
                </div>
              </div>

              <div>
                <div style={{ color: 'var(--text-primary)' }}>
                  {l.primary_contact_name || '—'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {l.primary_contact_title || ''}
                </div>
              </div>

              <div>
                {l.primary_contact_email ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary)', fontSize: '12px' }}>
                    <Mail size={12} />
                    <span>{l.primary_contact_email}</span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>—</span>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {l.industry || 'Technology'}
              </div>

              <div>
                <span className="badge badge-indigo">
                  {l.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
