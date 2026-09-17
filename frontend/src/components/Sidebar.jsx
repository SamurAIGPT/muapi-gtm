import React, { useState, useEffect } from 'react';
import {
  Table2,
  Users,
  Activity,
  Send,
  Zap,
  Settings,
  Sparkles,
  Wifi,
  ExternalLink,
  MessageSquare,
  ListFilter,
  Radar,
  BarChart3,
} from 'lucide-react';
import { api } from '../api/client';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const [connectionStatus, setConnectionStatus] = useState({ ok: false, checking: true });

  useEffect(() => {
    let mounted = true;
    api.testConnection()
      .then((res) => {
        if (mounted) setConnectionStatus({ ok: res.ok, checking: false, latency: res.latency_ms });
      })
      .catch(() => {
        if (mounted) setConnectionStatus({ ok: false, checking: false });
      });
    return () => { mounted = false; };
  }, []);

  const navItems = [
    { id: 'chat', label: 'AI Copilot', icon: <MessageSquare size={16} /> },
    { id: 'workbooks', label: 'Workbooks', icon: <Table2 size={16} /> },
    { id: 'leads', label: 'Global Leads', icon: <Users size={16} /> },
    { id: 'audiences', label: 'Audiences', icon: <ListFilter size={16} /> },
    { id: 'watches', label: 'Account Watches', icon: <Radar size={16} /> },
    { id: 'signals', label: 'Buying Signals', icon: <Activity size={16} /> },
    { id: 'outreach', label: 'Outreach Studio', icon: <Send size={16} /> },
    { id: 'automations', label: 'Automations', icon: <Zap size={16} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={16} /> },
    { id: 'settings', label: 'API & Settings', icon: <Settings size={16} /> },
  ];

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            backgroundColor: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '14px',
            boxShadow: '0 0 12px rgba(99, 102, 241, 0.4)',
          }}
        >
          μ
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            muapi-gtm
            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--accent-soft)', color: '#a5b4fc', fontWeight: 500 }}>
              GTM
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Clay Engine via Muapi</div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-soft)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                width: '100%',
                transition: 'all 0.1s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <span style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Muapi Live Status Footer */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 500 }}>
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: connectionStatus.ok ? 'var(--success)' : 'var(--warning)',
                boxShadow: connectionStatus.ok ? '0 0 6px rgba(16, 185, 129, 0.8)' : '0 0 6px rgba(245, 158, 11, 0.8)',
              }}
            />
            <span style={{ color: 'var(--text-secondary)' }}>
              {connectionStatus.checking ? 'Connecting...' : connectionStatus.ok ? 'Muapi Live' : 'Sandbox Mode'}
            </span>
          </div>
          {connectionStatus.ok && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {connectionStatus.latency}ms
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          14 unified endpoints active
        </div>
      </div>
    </aside>
  );
}
