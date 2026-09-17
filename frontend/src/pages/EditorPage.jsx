import React, { useState, useEffect, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowLeft,
  Plus,
  Play,
  Download,
  Upload,
  Sparkles,
  Layers,
  Brain,
  Globe,
  Calculator,
  UserCheck,
  TrendingUp,
  Type,
  MoreVertical,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  X,
  Mic,
  Image as ImageIcon
} from 'lucide-react';
import { api } from '../api/client';
import CustomSelect from '../components/CustomSelect';

const COLUMN_ICON_MAP = {
  lead_field: <Type size={13} />,
  enrichment: <Sparkles size={13} style={{ color: '#818cf8' }} />,
  technographics: <Layers size={13} style={{ color: '#38bdf8' }} />,
  decision_maker: <UserCheck size={13} style={{ color: '#34d399' }} />,
  buying_signals: <TrendingUp size={13} style={{ color: '#fbbf24' }} />,
  research: <Globe size={13} style={{ color: '#a78bfa' }} />,
  ai_transform: <Brain size={13} style={{ color: '#f472b6' }} />,
  formula: <Calculator size={13} style={{ color: '#9ca3af' }} />,
  multimodal: <Mic size={13} style={{ color: '#f87171' }} />,
};

export default function EditorPage({ workbookId, onBack }) {
  const [workbook, setWorkbook] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runningCols, setRunningCols] = useState({});
  const [activeDrawerCell, setActiveDrawerCell] = useState(null);

  // Column modal state
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColLabel, setNewColLabel] = useState('');
  const [newColType, setNewColType] = useState('enrichment');
  const [newColEndpoint, setNewColEndpoint] = useState('company-enrich');
  const [newColInput, setNewColInput] = useState('');
  const [newColFormula, setNewColFormula] = useState('');

  // Editing state
  const [editingCell, setEditingCell] = useState(null); // { rowId, colId, value }

  // Virtualizer parent ref
  const parentRef = useRef(null);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [wb, rowData] = await Promise.all([
        api.getWorkbook(workbookId),
        api.getRows(workbookId, 0, 1000),
      ]);
      setWorkbook(wb);
      setRows(rowData.rows || []);
      if (wb.columns && wb.columns.length > 0 && !newColInput) {
        setNewColInput(wb.columns[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workbookId]);

  // Virtualizer for 1000+ rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 38,
    overscan: 20,
  });

  const columns = workbook?.columns || [];

  // Handlers
  const handleAddRow = async () => {
    try {
      const newRow = await api.addRow(workbookId, {});
      setRows([...rows, newRow]);
    } catch (err) {
      alert(`Error adding row: ${err.message}`);
    }
  };

  const handleRunColumn = async (colId) => {
    try {
      setRunningCols((prev) => ({ ...prev, [colId]: true }));
      await api.runColumn(workbookId, colId);
      // Reload rows to get enriched data
      const rowData = await api.getRows(workbookId, 0, 1000);
      setRows(rowData.rows || []);
    } catch (err) {
      alert(`Execution failed: ${err.message}`);
    } finally {
      setRunningCols((prev) => ({ ...prev, [colId]: false }));
    }
  };

  const handleCellBlur = async () => {
    if (!editingCell) return;
    const { rowId, colId, value } = editingCell;
    setEditingCell(null);

    // Find if col is lead_field
    const col = columns.find((c) => c.id === colId);
    const isEnrichment = col?.type !== 'lead_field';

    try {
      await api.updateCell(workbookId, rowId, colId, value, isEnrichment);
      setRows((prev) =>
        prev.map((r) => {
          if (r.id !== rowId) return r;
          if (isEnrichment) {
            return {
              ...r,
              enrichments: {
                ...r.enrichments,
                [colId]: { value, status: 'complete', manual: true },
              },
            };
          } else {
            return { ...r, data: { ...r.data, [colId]: value } };
          }
        })
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddColumnSubmit = async (e) => {
    e.preventDefault();
    if (!newColLabel.trim()) return;

    let config = {};
    if (newColType === 'enrichment' || newColType === 'technographics' || newColType === 'buying_signals' || newColType === 'decision_maker' || newColType === 'research') {
      config = {
        endpoint: newColEndpoint,
        input_domain: newColInput,
        question: newColFormula || undefined,
      };
    } else if (newColType === 'formula') {
      config = { formula: newColFormula };
    } else if (newColType === 'ai_transform') {
      config = { endpoint: 'ai_transform', prompt: newColFormula };
    } else if (newColType === 'multimodal') {
      config = { endpoint: 'multimodal', multimodal_type: newColEndpoint === 'image' ? 'image' : 'voice', script: newColFormula };
    }

    try {
      const added = await api.addColumn(workbookId, {
        label: newColLabel.trim(),
        type: newColType,
        config,
        width: newColType === 'research' || newColType === 'ai_transform' ? 300 : 220,
      });
      setWorkbook((prev) => ({ ...prev, columns: [...prev.columns, added] }));
      setShowAddColModal(false);
      setNewColLabel('');
      setNewColFormula('');
    } catch (err) {
      alert(`Error creating column: ${err.message}`);
    }
  };

  const handleDeleteColumn = async (colId) => {
    if (!confirm('Are you sure you want to delete this column?')) return;
    try {
      await api.deleteColumn(workbookId, colId);
      setWorkbook((prev) => ({
        ...prev,
        columns: prev.columns.filter((c) => c.id !== colId),
      }));
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setLoading(true);
      await api.importCsv(workbookId, file);
      await loadData();
    } catch (err) {
      alert(`CSV import error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Dropdown options
  const colTypeOptions = [
    { value: 'enrichment', label: 'Company & People Firmographics', description: 'Domain or contact enrichment via Muapi', icon: <Sparkles size={14} style={{ color: '#818cf8' }} /> },
    { value: 'technographics', label: 'Website Tech Stack Detection', description: 'Detects frontend, CMS, CDP, CRM, and cloud', icon: <Layers size={14} style={{ color: '#38bdf8' }} /> },
    { value: 'decision_maker', label: 'Ranked Buyer Contacts', description: 'Find & rank target decision-makers', icon: <UserCheck size={14} style={{ color: '#34d399' }} /> },
    { value: 'buying_signals', label: 'Intent & Hiring Growth Signals', description: 'Job openings, hiring velocity, funding rounds', icon: <TrendingUp size={14} style={{ color: '#fbbf24' }} /> },
    { value: 'research', label: 'Exa Web Research Agent', description: 'Live web answers with cited source URLs', icon: <Globe size={14} style={{ color: '#a78bfa' }} /> },
    { value: 'ai_transform', label: 'AI Transform / ICP Scoring', description: 'LLM prompt completion per row', icon: <Brain size={14} style={{ color: '#f472b6' }} /> },
    { value: 'formula', label: 'Formula Calculation', description: 'CONCAT, DOMAIN, SPLIT, IF macros', icon: <Calculator size={14} /> },
    { value: 'multimodal', label: 'Multimodal Outreach Asset', description: 'Synthesizes voice greeting or dynamic mockup', icon: <Mic size={14} style={{ color: '#f87171' }} /> },
    { value: 'lead_field', label: 'Custom Input Field', description: 'Standard editable text column', icon: <Type size={14} /> },
  ];

  const endpointOptionsMap = {
    enrichment: [
      { value: 'company-enrich', label: 'Company Firmographics (/company-enrich)' },
      { value: 'people-search', label: 'People Search (/people-search)' },
      { value: 'email-verify', label: 'Email Verification (/email-verify)' },
      { value: 'company-products', label: 'Company Products & Pricing (/company-products)' },
    ],
    technographics: [
      { value: 'company-technographics', label: 'Tech Stack Detection (/company-technographics)' },
    ],
    decision_maker: [
      { value: 'people-rank-decision-makers', label: 'Rank Decision Makers (/people-rank-decision-makers)' },
      { value: 'linkedin-people-search', label: 'LinkedIn People Search (/linkedin-people-search)' },
    ],
    buying_signals: [
      { value: 'news-search', label: 'Real-Time News & Growth Announcements (/news-search)' },
      { value: 'company-buying-signals', label: 'Buying Signals & Intent (/company-buying-signals)' },
      { value: 'company-funding', label: 'Company Funding Rounds (/company-funding)' },
      { value: 'company-job-postings', label: 'Open Job Postings (/company-job-postings)' },
      { value: 'company-headcount-growth', label: 'Headcount Growth Velocity (/company-headcount-growth)' },
    ],
    research: [
      { value: 'research-web-answer', label: 'Exa Cited Web Answer (/research-web-answer)' },
    ],
    multimodal: [
      { value: 'voice', label: '15-sec Personalized Voice Note (Muapi TTS)' },
      { value: 'image', label: 'Dynamic Brand Mockup (Muapi Flux)' },
    ],
  };

  const inputColOptions = columns.map((c) => ({
    value: c.id,
    label: `${c.label} (${c.type})`,
  }));

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Loading spreadsheet engine...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', overflow: 'hidden' }}>
      {/* Top Toolbar */}
      <header
        style={{
          height: '52px',
          padding: '0 20px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-sidebar)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn-ghost" onClick={onBack} style={{ padding: '6px', borderRadius: '4px' }}>
            <ArrowLeft size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {workbook?.name}
            </span>
            <span className="badge badge-gray">{rows.length} rows</span>
            <span className="badge badge-indigo">{columns.length} columns</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".csv"
            onChange={handleCsvUpload}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>
            <Upload size={13} />
            <span>Import CSV</span>
          </button>
          <a
            href={api.getExportCsvUrl(workbookId)}
            className="btn btn-secondary btn-sm"
            download
            style={{ textDecoration: 'none' }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </a>
          <button className="btn btn-secondary btn-sm" onClick={handleAddRow}>
            <Plus size={13} />
            <span>Add Row</span>
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddColModal(true)}>
            <Plus size={13} />
            <span>Add Column</span>
          </button>
        </div>
      </header>

      {/* Spreadsheet Main Grid Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div
          ref={parentRef}
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: 'var(--bg-app)',
          }}
        >
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: 'var(--bg-sidebar)',
              borderBottom: '1px solid var(--border-strong)',
              width: 'max-content',
              minWidth: '100%',
            }}
          >
            {/* Row Number Header */}
            <div
              style={{
                width: '44px',
                minWidth: '44px',
                padding: '8px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textAlign: 'center',
                borderRight: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--bg-sidebar)',
              }}
            >
              #
            </div>

            {/* Dynamic Columns */}
            {columns.map((col) => {
              const isRunning = runningCols[col.id];
              return (
                <div
                  key={col.id}
                  style={{
                    width: `${col.width || 200}px`,
                    minWidth: `${col.width || 200}px`,
                    padding: '8px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    borderRight: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span>{COLUMN_ICON_MAP[col.type] || <Type size={13} />}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.label}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {col.type !== 'lead_field' && (
                      <button
                        className="btn-ghost"
                        disabled={isRunning}
                        onClick={() => handleRunColumn(col.id)}
                        style={{ padding: '3px 5px', borderRadius: '4px', fontSize: '10px' }}
                        title="Run Column"
                      >
                        {isRunning ? (
                          <span style={{ color: 'var(--accent-primary)', fontSize: '10px' }}>Running...</span>
                        ) : (
                          <Play size={11} style={{ fill: 'currentColor' }} />
                        )}
                      </button>
                    )}
                    <button
                      className="btn-ghost"
                      onClick={() => handleDeleteColumn(col.id)}
                      style={{ padding: '3px', borderRadius: '4px', color: 'var(--text-muted)' }}
                      title="Delete column"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Virtualized Rows Container */}
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: 'max-content',
              minWidth: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;

              return (
                <div
                  key={row.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'flex',
                    borderBottom: '1px solid var(--border-subtle)',
                    backgroundColor: virtualRow.index % 2 === 0 ? 'var(--bg-app)' : 'rgba(255,255,255,0.01)',
                  }}
                >
                  {/* Row Number */}
                  <div
                    style={{
                      width: '44px',
                      minWidth: '44px',
                      padding: '6px 8px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textAlign: 'center',
                      borderRight: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'var(--bg-sidebar)',
                    }}
                  >
                    {virtualRow.index + 1}
                  </div>

                  {/* Row Cells */}
                  {columns.map((col) => {
                    const isLeadField = col.type === 'lead_field';
                    let cellVal = '';
                    let enrichmentMeta = null;

                    if (isLeadField) {
                      cellVal = row.data?.[col.id] ?? row.data?.[col.config?.field_name] ?? row.data?.[col.label?.toLowerCase()] ?? '';
                    } else {
                      enrichmentMeta = row.enrichments?.[col.id];
                      cellVal = enrichmentMeta?.value ?? '';
                    }

                    const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;

                    return (
                      <div
                        key={col.id}
                        className={`grid-cell ${isEditing ? 'editing' : ''}`}
                        style={{
                          width: `${col.width || 200}px`,
                          minWidth: `${col.width || 200}px`,
                          cursor: isLeadField ? 'text' : 'pointer',
                        }}
                        onDoubleClick={() => {
                          setEditingCell({
                            rowId: row.id,
                            colId: col.id,
                            value: cellVal || '',
                          });
                        }}
                        onClick={() => {
                          if (!isLeadField && enrichmentMeta) {
                            setActiveDrawerCell({
                              column: col,
                              row: row,
                              meta: enrichmentMeta,
                            });
                          }
                        }}
                      >
                        {isEditing ? (
                          <input
                            type="text"
                            autoFocus
                            value={editingCell.value}
                            onChange={(e) =>
                              setEditingCell((prev) => ({
                                ...prev,
                                value: e.target.value,
                              }))
                            }
                            onBlur={handleCellBlur}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellBlur();
                              if (e.key === 'Escape') setEditingCell(null);
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', overflow: 'hidden' }}>
                            {enrichmentMeta?.status === 'complete' && (
                              <CheckCircle2 size={12} style={{ color: 'var(--success)', flexShrink: 0 }} />
                            )}
                            {enrichmentMeta?.status === 'error' && (
                              <AlertCircle size={12} style={{ color: 'var(--danger)', flexShrink: 0 }} />
                            )}
                            <span
                              style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: cellVal ? 'var(--text-primary)' : 'var(--text-muted)',
                              }}
                            >
                              {cellVal || (isLeadField ? '—' : 'Empty')}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Provenance Detail Drawer */}
        {activeDrawerCell && (
          <aside
            style={{
              width: '360px',
              borderLeft: '1px solid var(--border-strong)',
              backgroundColor: 'var(--bg-sidebar)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 20,
              boxShadow: '-10px 0 25px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeDrawerCell.column.label}
                </h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Row #{rows.findIndex((r) => r.id === activeDrawerCell.row.id) + 1} • {activeDrawerCell.meta.latency_ms || 0}ms
                </span>
              </div>
              <button className="btn-ghost" onClick={() => setActiveDrawerCell(null)} style={{ padding: '4px' }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Evaluated Value
                </label>
                <div style={{ marginTop: '4px', padding: '10px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', fontSize: '13px', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}>
                  {activeDrawerCell.meta.value || 'None'}
                </div>
              </div>

              {activeDrawerCell.meta.raw?.citations && (
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Web Citations ({activeDrawerCell.meta.raw.citations.length})
                  </label>
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {activeDrawerCell.meta.raw.citations.map((c, i) => (
                      <a
                        key={i}
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'block',
                          padding: '8px 10px',
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '6px',
                          border: '1px solid var(--border-subtle)',
                          textDecoration: 'none',
                          color: 'var(--accent-primary)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span>{c.title || 'Source'}</span>
                          <ExternalLink size={11} />
                        </div>
                        {c.snippet && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {c.snippet.slice(0, 100)}...
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Raw Payload Provenance
                </label>
                <pre
                  style={{
                    marginTop: '6px',
                    padding: '10px',
                    backgroundColor: '#0a0a0c',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: '#a5b4fc',
                    overflowX: 'auto',
                    border: '1px solid var(--border-subtle)',
                    fontFamily: 'monospace',
                    maxHeight: '300px',
                  }}
                >
                  {JSON.stringify(activeDrawerCell.meta.raw || activeDrawerCell.meta, null, 2)}
                </pre>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Add Column Modal */}
      {showAddColModal && (
        <div className="modal-backdrop" onClick={() => setShowAddColModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Add New Column
              </h2>
              <button className="btn-ghost" onClick={() => setShowAddColModal(false)} style={{ padding: '4px' }}>
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleAddColumnSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Column Header Name
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="e.g. Firmographics, Tech Stack, VP Sales"
                  value={newColLabel}
                  onChange={(e) => setNewColLabel(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Column Type
                </label>
                <CustomSelect
                  value={newColType}
                  onChange={(val) => {
                    setNewColType(val);
                    const epList = endpointOptionsMap[val];
                    if (epList && epList.length > 0) {
                      setNewColEndpoint(epList[0].value);
                    }
                  }}
                  options={colTypeOptions}
                />
              </div>

              {endpointOptionsMap[newColType] && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Muapi Capability Endpoint
                  </label>
                  <CustomSelect
                    value={newColEndpoint}
                    onChange={setNewColEndpoint}
                    options={endpointOptionsMap[newColType]}
                  />
                </div>
              )}

              {['enrichment', 'technographics', 'decision_maker', 'buying_signals'].includes(newColType) && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Input Domain / Email Column
                  </label>
                  <CustomSelect
                    value={newColInput}
                    onChange={setNewColInput}
                    options={inputColOptions}
                    placeholder="Select source column..."
                  />
                </div>
              )}

              {newColType === 'research' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Research Question Template
                  </label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. What is the pricing and main competitors for {domain}?"
                    value={newColFormula}
                    onChange={(e) => setNewColFormula(e.target.value)}
                  />
                </div>
              )}

              {newColType === 'ai_transform' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    LLM Prompt Template
                  </label>
                  <textarea
                    className="input-text"
                    rows={3}
                    placeholder="e.g. Write a 1-sentence personalized hook for {company} based on {industry}"
                    value={newColFormula}
                    onChange={(e) => setNewColFormula(e.target.value)}
                  />
                </div>
              )}

              {newColType === 'formula' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                    Spreadsheet Formula
                  </label>
                  <input
                    type="text"
                    className="input-text"
                    placeholder="e.g. DOMAIN({col_domain}) or CONCAT({First Name}, ' ', {Last Name})"
                    value={newColFormula}
                    onChange={(e) => setNewColFormula(e.target.value)}
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddColModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Column
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
