'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Loader2 } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessage as ChatMessageType, ChatResponse, WidgetAction } from '@/lib/types/api';

interface Props {
  dashboardWidgets?: import('@/lib/types/chart').ChartWidget[];
  onActions?: (actions: WidgetAction[]) => void;
  fixMessages?: ChatMessageType[];
}

export function ChatPanel({ dashboardWidgets, onActions, fixMessages }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevFixCountRef = useRef(0);

  // Sync incoming fix event messages into chat
  useEffect(() => {
    if (!fixMessages || fixMessages.length <= prevFixCountRef.current) return;
    const newMessages = fixMessages.slice(prevFixCountRef.current);
    prevFixCountRef.current = fixMessages.length;
    setMessages((prev) => [...prev, ...newMessages]);
  }, [fixMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessageType = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          dashboardContext: { widgets: dashboardWidgets || [] },
          mode: 'chat',
        }),
      });

      const data: ChatResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.message },
      ]);

      if (data.actions?.length && onActions) {
        onActions(data.actions);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '오류가 발생했습니다. 다시 시도해주세요.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-blue-800 transition-colors cursor-pointer z-50"
      >
        <MessageSquare className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 w-96 h-[600px] bg-white border-l border-t border-gray-200 shadow-xl flex flex-col z-50 rounded-tl-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-[var(--color-text)]">AI 어시스턴트</h3>
        <button onClick={() => setOpen(false)} className="p-1 hover:bg-gray-100 rounded cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-sm text-[var(--color-text-muted)] mt-8">
            차트를 만들거나 수정하고 싶으시면 말씀해주세요.
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-[var(--color-text-muted)] animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="border-t border-gray-100 p-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 매출완료율을 막대차트로 보여줘"
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
