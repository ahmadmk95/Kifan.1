'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { avBg } from '@/lib/palette';
import { api } from '@/lib/api';

export default function CommitteeChat({ committee, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [txt, setTxt] = useState('');
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    if (!committee) return;
    const { messages: m } = await api.chatMessages(committee.id);
    setMessages(m);
  }, [committee]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const v = txt.trim();
    if (!v || busy) return;
    setBusy(true);
    setTxt('');
    try {
      const { message } = await api.sendChatMessage(committee.id, v);
      setMessages((ms) => [...ms, message]);
    } finally {
      setBusy(false);
    }
  };

  if (!committee) return <div className="empty"><div className="ic">💬</div>اختاري لجنة</div>;

  return (
    <div className="chat-wrap">
      <div className="chat-msgs">
        {messages.length === 0 ? (
          <div className="chat-empty">لا رسائل بعد — ابدئي المحادثة 🤍</div>
        ) : (
          messages.map((m) => {
            const isMe = m.author_id === currentUser.id;
            return (
              <div key={m.id} className={'chat-msg' + (isMe ? ' chat-me' : '')}>
                {!isMe ? (
                  <div className="chat-av" style={{ background: avBg(m.author_id) }}>{m.author[0]}</div>
                ) : null}
                <div className="chat-bubble">
                  {!isMe ? <div className="chat-name">{m.author}</div> : null}
                  <div className="chat-text">{m.text}</div>
                  <div className="chat-time ar-num">{m.time}</div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-form">
        <input
          value={txt}
          onChange={(e) => setTxt(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="اكتبي رسالة..."
          disabled={busy}
        />
        <button className="chat-send" onClick={send} disabled={!txt.trim() || busy}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
