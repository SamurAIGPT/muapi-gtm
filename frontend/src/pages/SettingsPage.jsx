import React, { useState, useEffect } from 'react';
import { Settings, ShieldCheck, Wifi, CheckCircle2, AlertCircle, Sparkles, Key, Server, Layers, ExternalLink } from 'lucide-react';
import { api } from '../api/client';

export default function SettingsPage() {
  const [settingsData, setSettingsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [muapiKey, setMuapiKey] = useState('');
  const [muapiBaseUrl, setMuapiBaseUrl] = useState('https://api.muapi.ai');
  const [byokApollo, setByokApollo] = useState('');
  const [byokHunter, setByokHunter] = useState('');
  const [smartleadKey, setSmartleadKey] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettingsData(data);
      setMuapiKey(data.muapi_api_key || '');
      setMuapiBaseUrl(data.muapi_base_url || 'https://api.muapi.ai');
      setByokApollo(data.byok_apollo_key || '');
      setByokHunter(data.byok_hunter_key || '');
      setSmartleadKey(data.smartlead_api_key || '');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateSettings({
        muapi_api_key: muapiKey,
        muapi_base_url: muapiBaseUrl,
        byok_apollo_key: byokApollo,
        byok_hunter_key: byokHunter,
        smartlead_api_key: smartleadKey,
      });
      await loadSettings();
      alert('Settings saved successfully!');
    } catch (err) {
      alert(`Error saving: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);
      const res = await api.testConnection();
      setTestResult(res);
    } catch (err) {
      setTestResult({ ok: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const capabilities = [
    { name: 'Company Firmographics', endpoint: 'POST /api/v1/company-enrich', replaces: 'Apollo / People Data Labs', status: 'Live on Muapi' },
    { name: 'People & Contact Search', endpoint: 'POST /api/v1/people-search', replaces: 'Apollo / Contact Finders', status: 'Live on Muapi' },
    { name: 'Email Deliverability Verify', endpoint: 'POST /api/v1/email-verify', replaces: 'Hunter.io / DeBounce / NeverBounce', status: 'Live on Muapi' },
    { name: 'Company Products & Pricing', endpoint: 'POST /api/v1/company-products', replaces: 'Web Scrapers & Pricing Engines', status: 'Live on Muapi' },
    { name: 'Live News & Intent Search', endpoint: 'POST /api/v1/news-search', replaces: 'Google News / Media Crawlers', status: 'Live on Muapi' },
    { name: 'Company Technographics', endpoint: 'POST /api/v1/company-technographics', replaces: 'BuiltWith / Wappalyzer', status: 'Backend Routed' },
    { name: 'Buying & Intent Signals', endpoint: 'POST /api/v1/company-buying-signals', replaces: 'Bombora / 6sense Intent Feeds', status: 'Backend Routed' },
    { name: 'Rank Decision Makers', endpoint: 'POST /api/v1/people-rank-decision-makers', replaces: 'LeadIQ / Title Match Engines', status: 'Backend Routed' },
    { name: 'Company Funding History', endpoint: 'POST /api/v1/company-funding', replaces: 'Crunchbase / PitchBook', status: 'Backend Routed' },
    { name: 'LinkedIn Company Profile', endpoint: 'POST /api/v1/linkedin-company-profile', replaces: 'LinkedIn Company Scrapers', status: 'Backend Routed' },
    { name: 'LinkedIn Member Search', endpoint: 'POST /api/v1/linkedin-people-search', replaces: 'LinkedIn Search Adapters', status: 'Backend Routed' },
    { name: 'LinkedIn Employee Roster', endpoint: 'POST /api/v1/linkedin-employees', replaces: 'LinkedIn Employee Crawlers', status: 'Backend Routed' },
    { name: 'Open Job Postings', endpoint: 'POST /api/v1/company-job-postings', replaces: 'Greenhouse / Lever / ATS Scrapers', status: 'Backend Routed' },
    { name: 'Headcount Growth Velocity', endpoint: 'POST /api/v1/company-headcount-growth', replaces: 'LinkedIn Talent Insights', status: 'Backend Routed' },
    { name: 'Exa Cited Web Research', endpoint: 'POST /api/v1/research-web-answer', replaces: 'Exa / Perplexity Search APIs', status: 'Backend Routed' },
    { name: 'LLM Transforms & Scoring', endpoint: 'POST /api/v1/gpt-5-mini', replaces: 'OpenAI GPT-4o / Claygent', status: 'Live on Muapi' },
    { name: 'Personalized Voice Notes (TTS)', endpoint: 'POST /api/v1/elevenlabs-tts-turbo-2-5', replaces: 'ElevenLabs Voice Engine', status: 'Live on Muapi' },
    { name: 'Branded Dynamic Mockups', endpoint: 'POST /api/v1/flux-schnell-image', replaces: 'Flux / Midjourney Image APIs', status: 'Live on Muapi' },
  ];

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', marginBottom: '4px' }}>
          API Keys & Engine Settings
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Configure your unified Muapi API key. A single key replaces 10+ fragmented vendor subscriptions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px' }}>
        {/* Settings Form */}
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={15} style={{ color: 'var(--accent-primary)' }} />
              <span>Unified Muapi Credentials</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Muapi API Key
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Enter your Muapi API Key (e.g. muapi_sk_...)"
                  value={muapiKey}
                  onChange={(e) => setMuapiKey(e.target.value)}
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Stored securely in local SQLite WAL database.
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Muapi Base URL
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={muapiBaseUrl}
                  onChange={(e) => setMuapiBaseUrl(e.target.value)}
                  placeholder="https://api.muapi.ai"
                />
                <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Use default production cloud or point to your local muapiapp backend (e.g. http://127.0.0.1:8000).
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleTestConnection}
                  disabled={testing}
                >
                  <Wifi size={13} />
                  <span>{testing ? 'Testing...' : 'Test Connection'}</span>
                </button>

                {testResult && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: testResult.ok ? 'var(--success)' : 'var(--danger)' }}>
                    {testResult.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                    <span>{testResult.message || testResult.error}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Optional BYOK & Integrations */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '24px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={15} style={{ color: '#a78bfa' }} />
              <span>Optional BYOK & CRM Fallbacks</span>
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Apollo.io API Key (Optional BYOK Fallback)
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Optional BYOK Apollo key"
                  value={byokApollo}
                  onChange={(e) => setByokApollo(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Hunter.io API Key (Optional BYOK Fallback)
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Optional BYOK Hunter key"
                  value={byokHunter}
                  onChange={(e) => setByokHunter(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Smartlead.ai API Key (Outreach Destination)
                </label>
                <input
                  type="text"
                  className="input-text"
                  placeholder="Optional Smartlead token"
                  value={smartleadKey}
                  onChange={(e) => setSmartleadKey(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>

        {/* Live Mapped Capabilities Reference */}
        <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '24px', height: 'fit-content' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Live Mapped Capabilities
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Unified GTM intelligence directly powered by live Muapi endpoints.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {capabilities.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: '8px 10px',
                  backgroundColor: 'var(--bg-input)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '3px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {c.name}
                  </span>
                  <span className="badge badge-success" style={{ fontSize: '10px' }}>
                    {c.status}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--accent-primary)', fontFamily: 'monospace' }}>
                  {c.endpoint}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Replaces: {c.replaces}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
