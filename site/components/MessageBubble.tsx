import React from 'react';
import type { Message } from '../types';
import VoiceMessagePlayer from './VoiceMessagePlayer';

interface MessageBubbleProps {
  message: Message;
  isGroup?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isGroup }) => {
  const isSentByMe = message.isSentByMe;
  const alignment = isSentByMe ? 'justify-end' : 'justify-start';
  const bubbleColor = isSentByMe ? 'bg-gray-200 dark:bg-gray-700' : 'bg-light-secondary dark:bg-dark-secondary';

  const formatTimestamp = (ts: number) => {
    return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${alignment} mb-4`}>
      <div className={`max-w-md lg:max-w-lg px-4 py-2 rounded-lg ${bubbleColor}`}>
        {isGroup && !isSentByMe && (
            <p className="text-xs font-bold text-soviet-red mb-1">{message.sender}</p>
        )}
        {message.content && (
            <p className="text-dark-primary dark:text-light-primary whitespace-pre-wrap break-words">{message.content}</p>
        )}
        {(message.audioUrl || message.audioFileId) && (
            <VoiceMessagePlayer audioUrl={message.audioUrl} audioFileId={message.audioFileId} />
        )}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-right mt-1">{formatTimestamp(message.timestamp)}</p>
      </div>
    </div>
  );
};

export default MessageBubble;