import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  Lightbulb,
  CornerDownLeft,
  RefreshCw,
} from 'lucide-react';
import { api } from '../api/client';

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      content:
        "Hello! I am your **Muapi-GTM AI Copilot**. I can help you analyze accounts, craft personalized outbound copy, formulate enrichment waterfalls, and qualify prospect pipelines using live Muapi intelligence.\n\nWhat would you like to explore today?",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    'Draft a 3-step cold email sequence for Stripe focusing on global payments expansion',
    'How should I structure an enrichment waterfall for B2B SaaS accounts?',
    'What buying signals indicate a high-intent enterprise prospect is ready to buy?',
    'Recommend a decision-maker targeting strategy for Series A-C tech startups',
  ];

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadHistory = async () => {
    try {
      const history = await api.getChatHistory();
      if (history.length > 0) {
        setMessages(history);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
  };

  const handleSend = async (textToSend = null) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg = { id: String(Date.now()), role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await api.sendChatMessage(text);
      setMessages((prev) => [...prev, resp]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: 'Sorry, I encountered an error communicating with the Muapi AI engine: ' + err.message,
        },
      ]);
    } finally {
      setLoading(false);
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
              AI GTM Copilot & Account Research
            </h1>
            <span className="badge badge-primary" style={{ fontSize: '10px' }}>
              Muapi gpt-5-mini
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Conversational SDR intelligence, qualification strategies, and personalized outbound drafting.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
          <span>Live LLM Connected</span>
        </div>
      </header>

      {/* Chat Messages Container */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start',
                maxWidth: '820px',
                alignSelf: isUser ? 'flex-end' : 'flex-start',
              }}
            >
              {!isUser && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <Bot size={18} />
                </div>
              )}

              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  backgroundColor: isUser ? 'var(--accent-soft)' : 'var(--bg-card)',
                  border: `1px solid ${isUser ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                  color: isUser ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                {m.content}
              </div>

              {isUser && (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  <User size={18} />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <RefreshCw size={16} className="animate-spin" />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Muapi AI is generating GTM intelligence...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts (if only 1 message) */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 32px 14px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {suggestedPrompts.map((p, idx) => (
            <button
              key={idx}
              className="btn btn-secondary btn-sm"
              onClick={() => handleSend(p)}
              style={{
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              <Lightbulb size={12} style={{ color: '#f59e0b' }} />
              <span>{p}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input Bar */}
      <div style={{ padding: '16px 32px', borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          style={{ display: 'flex', gap: '10px' }}
        >
          <input
            type="text"
            className="input-text"
            placeholder="Ask the AI Copilot to analyze target accounts, formulate waterfalls, or draft emails..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            style={{ flex: 1, padding: '10px 14px' }}
          />

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || !input.trim()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 20px' }}
          >
            <Send size={14} />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
