
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Message } from '../types';
import MessageBubble from './MessageBubble';

interface ChatWindowProps {
  activeChatInfo: { id: string; name: string; isGroup: boolean; isGroupAdmin: boolean; } | null;
  messages: Message[];
  onSendMessage: (payload: { content?: string; audioFile?: File }) => void;
  isLoading: boolean;
  onDeleteChat: () => void;
  error: string | null;
}

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const MicrophoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v3a3 3 0 01-3 3z" />
    </svg>
);

const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M6.5 5.5l8 4.5-8 4.5v-9z" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.75 4.5a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5zm6.5 0a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const CancelRecordIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PhoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);

const EndCallIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 transform rotate-[135deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
);


const ChatWindow: React.FC<ChatWindowProps> = ({ activeChatInfo, messages, onSendMessage, isLoading, onDeleteChat, error }) => {
  const [inputValue, setInputValue] = useState('');
  const [isCalling, setIsCalling] = useState(false);
  
  type RecordingState = 'idle' | 'recording' | 'paused';
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingTime, setRecordingTime] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
        // Detach the onstop handler to prevent sending the message on cancel
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current = null;
    }
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
    }
    setRecordingState('idle');
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, []);
  
  // Clear input and recording state when chat changes
  useEffect(() => {
    setInputValue('');
    setIsCalling(false);
    if (recordingState !== 'idle') {
      cancelRecording();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatInfo, cancelRecording]);

  const handleSendText = () => {
    if (inputValue.trim()) {
      onSendMessage({ content: inputValue });
      setInputValue('');
    }
  };

  const handleDeleteClick = () => {
    onDeleteChat();
  }

  const formatRecordingTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        // The API expects an mp3 file, so we name it accordingly. The server should handle conversion.
        const audioFile = new File([audioBlob], `voice_message_${Date.now()}.mp3`, { type: 'audio/mpeg' });
        onSendMessage({ audioFile });
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setRecordingState('recording');
      setRecordingTime(0);
      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prevTime => prevTime + 1);
      }, 1000);
    } catch (err) {
      console.error("Error starting recording:", err);
      alert("Не удалось получить доступ к микрофону. Проверьте разрешения в настройках браузера.");
    }
  };
  
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.pause();
        setRecordingState('paused');
        if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current);
            timerIntervalRef.current = null;
        }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
        mediaRecorderRef.current.resume();
        setRecordingState('recording');
        timerIntervalRef.current = window.setInterval(() => {
            setRecordingTime(prevTime => prevTime + 1);
        }, 1000);
    }
  };

  const sendActiveRecording = () => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop(); // This triggers the onstop handler which sends the file
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    setRecordingState('idle');
  };

  const handleMicPauseResumeClick = () => {
    switch(recordingState) {
        case 'idle':
            startRecording();
            break;
        case 'recording':
            pauseRecording();
            break;
        case 'paused':
            resumeRecording();
            break;
    }
  };

  const handleSendClick = () => {
    if (recordingState !== 'idle') {
        sendActiveRecording();
    } else {
        handleSendText();
    }
  };


  if (!activeChatInfo) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
        <h2 className="text-2xl">Выберите чат для начала общения</h2>
      </div>
    );
  }
  
  const canDelete = !activeChatInfo.isGroup || activeChatInfo.isGroupAdmin;
  const deleteLabel = activeChatInfo.isGroup ? 'Удалить группу' : 'Удалить чат';
  const deleteTooltip = !canDelete ? 'Только администратор может удалить группу' : `Удалить ${activeChatInfo.isGroup ? 'группу' : 'чат'} с ${activeChatInfo.name}`;

  return (
    <div className="h-full flex flex-col relative">
      <div className="p-4 bg-light-secondary dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold">{activeChatInfo.name}</h2>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsCalling(true)}
                disabled={activeChatInfo.isGroup}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-green-500 dark:hover:text-green-400 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1 rounded-md transition-colors duration-200 disabled:text-gray-400 disabled:dark:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                aria-label={`Позвонить ${activeChatInfo.name}`}
            >
                <PhoneIcon />
                <span>Позвонить</span>
            </button>
            <button 
                onClick={handleDeleteClick}
                disabled={!canDelete}
                title={deleteTooltip}
                className="flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-soviet-red hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-1 rounded-md transition-colors duration-200 disabled:text-gray-400 disabled:dark:text-gray-600 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                aria-label={deleteLabel}
            >
                <TrashIcon />
                <span>{deleteLabel}</span>
            </button>
        </div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto bg-light-primary dark:bg-dark-primary relative">
        {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-light-primary/80 dark:bg-dark-primary/80 z-10">
                <p className="text-xl text-gray-500 dark:text-gray-400">Загрузка истории...</p>
            </div>
        ) : messages.length === 0 && !error ? (
             <div className="flex items-center justify-center h-full">
                <p className="text-gray-500">Сообщений пока нет. Начните диалог!</p>
            </div>
        ) : (
            messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} isGroup={activeChatInfo.isGroup} />
            ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 bg-light-secondary dark:bg-dark-secondary border-t border-gray-200 dark:border-gray-700">
        {error && (
            <div className="bg-soviet-red/20 border border-soviet-red text-soviet-red px-3 py-2 rounded-md mb-3 text-sm">
                <strong>Ошибка:</strong> {error}
            </div>
        )}
        <div className="flex items-center">
            {recordingState !== 'idle' ? (
                <>
                    <button
                        onClick={cancelRecording}
                        className="text-white p-2 bg-gray-500 hover:bg-gray-600 rounded-l-md transition-colors h-[42px] flex items-center"
                        aria-label="Отменить запись"
                    >
                        <CancelRecordIcon />
                    </button>
                    <div className="flex-1 flex items-center justify-center p-2 h-[42px] bg-gray-100 dark:bg-dark-primary border-t border-b border-gray-300 dark:border-gray-600">
                        <div className={`w-3 h-3 bg-soviet-red rounded-full mr-3 ${recordingState === 'recording' ? 'animate-pulse' : ''}`}></div>
                        <span className="text-lg font-mono text-dark-primary dark:text-light-primary">{formatRecordingTime(recordingTime)}</span>
                    </div>
                </>
            ) : (
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendText()}
                    placeholder="Напишите сообщение..."
                    className="flex-1 bg-gray-100 dark:bg-dark-primary text-dark-primary dark:text-light-primary p-2 rounded-l-md outline-none focus:ring-2 focus:ring-soviet-red/50 border border-gray-300 dark:border-gray-600"
                />
            )}
            <button
                onClick={handleMicPauseResumeClick}
                className={`text-white p-2 transition-colors ${recordingState === 'recording' ? 'bg-red-700 hover:bg-red-800' : 'bg-gray-500 hover:bg-gray-600'}`}
                aria-label={
                    recordingState === 'idle' ? 'Начать запись' :
                    recordingState === 'recording' ? 'Приостановить запись' : 'Продолжить запись'
                }
            >
                {recordingState === 'idle' && <MicrophoneIcon />}
                {recordingState === 'recording' && <PauseIcon />}
                {recordingState === 'paused' && <PlayIcon />}
            </button>
            <button
                onClick={handleSendClick}
                className="bg-soviet-red text-white p-2 rounded-r-md hover:bg-red-700 transition-colors"
                disabled={!inputValue.trim() && recordingState === 'idle'}
                aria-label={recordingState !== 'idle' ? 'Отправить голосовое сообщение' : 'Отправить сообщение'}
            >
                <SendIcon />
            </button>
        </div>
      </div>

      {isCalling && (
        <div className="absolute inset-0 bg-light-primary/95 dark:bg-dark-primary/95 flex flex-col items-center justify-center z-20 transition-opacity duration-300">
          <p className="text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest animate-pulse">Вызов...</p>
          <h2 className="text-4xl font-bold text-dark-primary dark:text-light-primary mb-8">{activeChatInfo.name}</h2>
          <div className="relative w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-green-500/20 animate-ping"></div>
            <div className="relative flex items-center justify-center w-24 h-24 rounded-full bg-green-500/30 text-green-300">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
          </div>
          <button
            onClick={() => setIsCalling(false)}
            className="mt-12 bg-soviet-red hover:bg-red-700 text-white font-bold py-3 px-6 uppercase tracking-wider rounded-lg flex items-center"
            aria-label="Завершить вызов"
          >
            <EndCallIcon />
            <span className="ml-2">Завершить вызов</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;