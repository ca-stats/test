'use client';

import { Bot, User, Wrench } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '@/lib/types/api';

interface Props {
  message: ChatMessageType;
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const isSystem = message.type === 'system';

  if (isSystem) {
    return (
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-amber-100">
          <Wrench className="w-4 h-4 text-amber-600" />
        </div>
        <div className="max-w-[80%] rounded-lg px-4 py-2 text-xs bg-amber-50 text-amber-800 border border-amber-200 whitespace-pre-line">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? 'bg-[var(--color-primary)]' : 'bg-gray-100'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-[var(--color-text-muted)]" />
        }
      </div>
      <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-line ${
        isUser
          ? 'bg-[var(--color-primary)] text-white'
          : 'bg-gray-100 text-[var(--color-text)]'
      }`}>
        {message.content}
      </div>
    </div>
  );
}
