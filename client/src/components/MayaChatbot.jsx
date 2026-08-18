import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../context/AppContext';
import Logo from './Logo';

const MayaAvatar = ({ size = 48, className = '' }) => (
  <div
    className={`rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`}
    style={{
      width: size, height: size,
      boxShadow: '0 4px 16px rgba(232,0,61,0.25)',
      background: '#fff',
    }}
  >
    <img src="/maya.png" alt="Maya Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  </div>
);

// ── Send icon ─────────────────────────────────────────────────────
const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-5 h-5">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── Typing indicator ──────────────────────────────────────────────
const TypingDots = () => (
  <div className="flex gap-1 items-center px-1 py-1">
    {[0, 1, 2].map(i => (
      <motion.div key={i} className="w-2 h-2 rounded-full"
        style={{ background: 'var(--color-text-muted)' }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 0.9, delay: i * 0.2, repeat: Infinity }}
      />
    ))}
  </div>
);

// ── Initial quick reply chips ─────────────────────────────────────
const INITIAL_CHIPS = [
  'How to book a room?',
  'Cancellation policy',
  'Coupon codes',
  'Check-in & check-out time',
];

const MayaChatbot = () => {
  const { axios, user } = useAppContext();
  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState([
    {
      role: 'maya',
      content: `Hi${user?.username ? ` ${user.username.split(' ')[0]}` : ''}! 👋 I'm **Maya**, your YoYo Rooms assistant.\n\nI can help you with bookings, cancellations, offers, and more. What can I do for you?`,
      chips: INITIAL_CHIPS,
    },
  ]);
  const [input,     setInput]     = useState('');
  const [isTyping,  setIsTyping]  = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  // Hide bubble after 6s
  useEffect(() => {
    const t = setTimeout(() => setShowBubble(false), 6000);
    return () => clearTimeout(t);
  }, []);

  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText) return;

    // Add user message
    const userMsg = { role: 'user', content: userText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const { data } = await axios.post('/api/ai/chat', {
        message: userText,
        history,
        userId: user?._id,
      });

      if (data.success) {
        setMessages(prev => [
          ...prev,
          {
            role:   'maya',
            content: data.reply,
            chips:   data.quickReplies || [],
          },
        ]);
      } else {
        throw new Error('No reply');
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role:    'maya',
          content: "Sorry, I'm having trouble connecting. Please try again in a moment! 🙏",
          chips:   INITIAL_CHIPS,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Render markdown bold (**text**)
  const renderContent = (text) =>
    text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : part
    );

  return (
    <>
      {/* ── Floating trigger button ─────────────────────────────── */}
      <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-2">

        {/* "Need help?" bubble */}
        <AnimatePresence>
          {showBubble && !isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white text-sm font-semibold shadow-xl cursor-pointer"
              style={{ background: '#E8003D', boxShadow: '0 8px 24px rgba(232,0,61,0.4)' }}
              onClick={() => { setIsOpen(true); setShowBubble(false); }}
            >
              <span>Need help?</span>
              <button
                onClick={e => { e.stopPropagation(); setShowBubble(false); }}
                className="opacity-70 hover:opacity-100 font-bold"
              >✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar button */}
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => { setIsOpen(o => !o); setShowBubble(false); }}
          className="relative"
          aria-label="Chat with Maya"
        >
          <MayaAvatar size={58} />
          {/* Online dot */}
          <span className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
        </motion.button>
      </div>

      {/* ── Chat window ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.94 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="fixed bottom-36 md:bottom-28 right-4 md:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden flex flex-col"
            style={{
              height: '520px',
              background: 'var(--color-surface-2)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(232,0,61,0.12)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 flex-shrink-0"
              style={{ background: '#E8003D' }}
            >
              <MayaAvatar size={38} />
              <div className="flex-1">
                <p className="font-bold text-white text-sm leading-none">Maya</p>
                <p className="text-white/70 text-xs mt-0.5">YoYo Rooms Assistant • Online</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/70 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >✕</button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'maya' && <MayaAvatar size={30} />}

                  <div className={`flex flex-col gap-2 max-w-[82%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {/* Bubble */}
                    <div
                      className="px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed"
                      style={msg.role === 'user'
                        ? { background: '#E8003D', color: '#fff', borderRadius: '18px 18px 4px 18px' }
                        : { background: 'var(--color-surface-3)', color: 'var(--color-text-primary)', borderRadius: '18px 18px 18px 4px' }
                      }
                    >
                      {renderContent(msg.content)}
                    </div>

                    {/* Quick reply chips */}
                    {msg.role === 'maya' && msg.chips?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {msg.chips.map((chip, ci) => (
                          <button
                            key={ci}
                            onClick={() => sendMessage(chip)}
                            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:scale-105 active:scale-95"
                            style={{
                              borderColor: 'rgba(232,0,61,0.35)',
                              color: '#E8003D',
                              background: 'rgba(232,0,61,0.06)',
                            }}
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-2.5 items-center">
                  <MayaAvatar size={30} />
                  <div className="px-3.5 py-2 rounded-2xl" style={{ background: 'var(--color-surface-3)', borderRadius: '18px 18px 18px 4px' }}>
                    <TypingDots />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <div
              className="flex items-center gap-2 px-3 py-3 flex-shrink-0 border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* YoYo brand logo */}
              <div className="flex-shrink-0 flex items-center justify-center">
                <Logo size="sm" iconOnly />
              </div>

              <input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message…"
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: 'var(--color-text-primary)' }}
                maxLength={500}
              />

              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isTyping}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95 flex-shrink-0"
                style={{ background: '#E8003D', boxShadow: '0 4px 12px rgba(232,0,61,0.35)' }}
              >
                <SendIcon />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MayaChatbot;
