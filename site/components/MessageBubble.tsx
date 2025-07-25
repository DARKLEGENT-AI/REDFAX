
import React from 'react';
import type { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isSentByMe = message.isSentByMe;
  const alignment = isSentByMe ? 'justify-end' : 'justify-start';
  const bubbleColor = isSentByMe ? 'bg-gray-200 dark:bg-gray-700' : 'bg-light-secondary dark:bg-dark-secondary';

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${alignment} mb-4`}>
      <div className={`max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${bubbleColor}`}>
        <p className="text-dark-primary dark:text-light-primary whitespace-pre-wrap break-words">{message.content}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">{formatTimestamp(message.timestamp)}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
