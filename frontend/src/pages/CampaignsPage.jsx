import React, { useState } from 'react';
import { Send, Sparkles, Mic, Image as ImageIcon, Copy, Check, Play, Download, ExternalLink, Sliders } from 'lucide-react';
import { api } from '../api/client';
import CustomSelect from '../components/CustomSelect';

export default function CampaignsPage() {
  const [form, setForm] = useState({
    company_name: 'Stripe',
    domain: 'stripe.com',
    contact_name: 'Sarah Chen',
    contact_title: 'VP of Revenue Operations',
    industry: 'Financial Infrastructure',
    tech_stack: 'Segment, React, AWS CloudFront',
    intent_signal: 'Scaling RevOps & Engineering teams (+35% this quarter)',
    voice_id: 'Rachel',
    tone: 'conversational_professional',
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLinkedIn, setCopiedLinkedIn] = useState(false);

  const voiceOptions = [
    { value: 'Rachel', label: 'Rachel (Calm & Professional)', description: 'Best for B2B Enterprise Decision Makers' },
    { value: 'Adam', label: 'Adam (Confident & Direct)', description: 'Great for Founders and Tech Executives' },
    { value: 'Emily', label: 'Emily (Warm & Conversational)', description: 'High engagement for Mid-Market and SMB' },
    { value: 'Antoni', label: 'Antoni (Authoritative & Sharp)', description: 'Ideal for Finance and Operations' },
  ];

  const toneOptions = [
    { value: 'conversational_professional', label: 'Conversational & Concise', description: 'Under 90 words, respectful, low friction' },
    { value: 'challenger_direct', label: 'Challenger / Value-Driven', description: 'Points directly to tech friction and resolution' },
    { value: 'warm_peer', label: 'Peer-to-Peer Casual', description: 'Colleague style for engineering/product leaders' },
  ];

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const data = await api.generateOutreach(form);
      setResult(data);
    } catch (err) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'email') {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    } else {
      setCopiedLinkedIn(true);
      setTimeout(() => setCopiedLinkedIn(false), 2000);
    }
  };

  return (
    <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Multimodal Outreach Studio
          </h1>
          <span className="badge badge-indigo">
            Muapi Superpower
          </span>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Generate hyper-personalized cold copy, 15-second personalized voice audio greetings, and branded mockups.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '28px' }}>
        {/* Input Parameters Form */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '24px',
            height: 'fit-content',
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={15} />
            <span>Target Prospect Context</span>
          </h2>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Domain
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Job Title
                </label>
                <input
                  type="text"
                  className="input-text"
                  value={form.contact_title}
                  onChange={(e) => setForm({ ...form, contact_title: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Enriched Tech Stack
              </label>
              <input
                type="text"
                className="input-text"
                value={form.tech_stack}
                onChange={(e) => setForm({ ...form, tech_stack: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                Trigger Signal / Intent Note
              </label>
              <input
                type="text"
                className="input-text"
                value={form.intent_signal}
                onChange={(e) => setForm({ ...form, intent_signal: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Voice Clone Persona
                </label>
                <CustomSelect
                  value={form.voice_id}
                  onChange={(val) => setForm({ ...form, voice_id: val })}
                  options={voiceOptions}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>
                  Outbound Copy Tone
                </label>
                <CustomSelect
                  value={form.tone}
                  onChange={(val) => setForm({ ...form, tone: val })}
                  options={toneOptions}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
              <Sparkles size={15} />
              <span>{loading ? 'Synthesizing Multimodal Assets...' : 'Generate 1-to-1 Assets'}</span>
            </button>
          </form>
        </div>

        {/* Output Showcase */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!result && !loading && (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '8px',
                border: '1px dashed var(--border-strong)',
                color: 'var(--text-muted)',
              }}
            >
              <Send size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Ready to generate
              </div>
              <div style={{ fontSize: '12px' }}>
                Click 'Generate 1-to-1 Assets' to create personalized email, voice note, and dynamic branded mockup.
              </div>
            </div>
          )}

          {loading && (
            <div
              style={{
                padding: '60px 20px',
                textAlign: 'center',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
              }}
            >
              <div style={{ marginBottom: '12px', color: 'var(--accent-primary)' }}>
                <Sparkles size={24} style={{ margin: '0 auto', animation: 'spin 2s linear infinite' }} />
              </div>
              Executing LLM copy synthesis, Muapi TTS voice generation, and Flux asset rendering...
            </div>
          )}

          {result && (
            <>
              {/* 1. Personalized Email Copy */}
              <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Personalized Cold Email
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(result.email?.body, 'email')}
                  >
                    {copiedEmail ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                    <span>{copiedEmail ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Subject: {result.email?.subject}
                </div>
                <div
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    padding: '12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {result.email?.body}
                </div>
              </div>

              {/* 2. Voice Audio Note */}
              {result.voice_note && (
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Mic size={15} style={{ color: 'var(--accent-primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Personalized Voice Audio Greeting ({result.voice_note.voice})
                      </span>
                    </div>
                    <span className="badge badge-indigo">15s Voice Note</span>
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px', fontStyle: 'italic' }}>
                    "{result.voice_note.script}"
                  </p>

                  {result.voice_note.audio_url && (
                    <audio
                      controls
                      src={result.voice_note.audio_url}
                      style={{ width: '100%', height: '36px', borderRadius: '6px' }}
                    />
                  )}
                </div>
              )}

              {/* 3. Branded Visual Mockup */}
              {result.visual_mockup?.image_url && (
                <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ImageIcon size={15} style={{ color: '#38bdf8' }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        Dynamic Prospect Visual Asset
                      </span>
                    </div>
                    <a
                      href={result.visual_mockup.image_url}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-ghost"
                      style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <span>Full view</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>

                  <img
                    src={result.visual_mockup.image_url}
                    alt="Prospect preview mockup"
                    style={{
                      width: '100%',
                      maxHeight: '220px',
                      objectFit: 'cover',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
