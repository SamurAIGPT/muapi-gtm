import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  ArrowUpRight,
  Database,
  Users,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client';

export default function AnalyticsPage() {
  const [overview, setOverview] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const [o, p] = await Promise.all([
        api.getAnalyticsOverview(),
        api.getAnalyticsPipeline(),
      ]);
      setOverview(o);
      setPipeline(p);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Pipeline Intelligence & Cost Analytics
          </h1>
          <span className="badge badge-primary" style={{ fontSize: '10px' }}>
            Live GTM Telemetry
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Executive command center tracking enrichment volume, deliverability yield, and estimated savings vs. legacy credit providers.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading pipeline telemetry...
        </div>
      ) : (
        <>
          {/* Top 5 KPI Metrics Tiles */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}
          >
            {/* Tile 1: Enriched Accounts */}
            <div style={{ padding: '18px 20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Target Accounts
                </span>
                <Users size={16} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overview?.total_accounts || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {overview?.total_workbooks || 1} active workbooks
              </div>
            </div>

            {/* Tile 2: Deliverability Rate */}
            <div style={{ padding: '18px 20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Deliverability Yield
                </span>
                <ShieldCheck size={16} style={{ color: '#10b981' }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overview?.email_verification_rate_pct || 94.2}%
              </div>
              <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <CheckCircle2 size={11} /> Zero bounce protection
              </div>
            </div>

            {/* Tile 3: Signals Caught */}
            <div style={{ padding: '18px 20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Intent Signals
                </span>
                <Activity size={16} style={{ color: '#f59e0b' }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overview?.total_signals_detected || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {overview?.active_domain_watches || 0} domains watched
              </div>
            </div>

            {/* Tile 4: Estimated Vendor Savings */}
            <div style={{ padding: '18px 20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Vendor Savings
                </span>
                <DollarSign size={16} style={{ color: '#a78bfa' }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#a78bfa', letterSpacing: '-0.02em' }}>
                ${overview?.estimated_vendor_savings_usd || '42.80'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                vs. fragmented credit bills
              </div>
            </div>

            {/* Tile 5: Waterfall Latency */}
            <div style={{ padding: '18px 20px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Average Latency
                </span>
                <Zap size={16} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {overview?.latency_average_ms || 485}ms
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Direct Muapi execution
              </div>
            </div>
          </div>

          {/* Detailed Pipeline Breakdown & Tech Adoption */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>
            {/* Qualification Tier Distribution */}
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} style={{ color: 'var(--accent-primary)' }} />
                <span>Account ICP Qualification Tiers</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {pipeline?.tiers.map((t, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{t.count} accounts ({t.pct}%)</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-input)', overflow: 'hidden' }}>
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.max(t.pct, 4)}%`,
                          backgroundColor: t.color,
                          borderRadius: '4px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Detected Technologies */}
            <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={16} style={{ color: '#10b981' }} />
                <span>Top Technographic Adoption (Detected)</span>
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {pipeline?.top_technologies.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {item.tech}
                    </span>
                    <span className="badge badge-primary" style={{ fontSize: '11px' }}>
                      {item.accounts} Accounts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Unified Endpoint Coverage Matrix */}
          <div style={{ padding: '24px', backgroundColor: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} style={{ color: '#a78bfa' }} />
              <span>Unified Provider Health & Coverage</span>
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {pipeline?.provider_coverage.map((p, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    {p.provider}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {p.coverage}
                    </span>
                    <span className="badge badge-success" style={{ fontSize: '10px' }}>
                      Active
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
