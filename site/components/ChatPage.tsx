import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, Contact, ApiMessage, Group } from '../types';
import { api } from '../services/apiService';
import { useWebSocket } from '../hooks/useWebSocket';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import AddContactModal from './AddContactModal';
import GroupModal from './GroupModal';
import AttachmentModal from './AttachmentModal';
import FilePreviewModal from './FilePreviewModal';

type Tab = 'messenger' | 'news' | 'polls' | 'files' | 'calendar' | 'profile';

interface ChatPageProps {
  user: { username:string };
  token: string;
  onLogout: () => void;
  onNavigate: (tab: Tab) => void;
}

export interface ActiveChat {
  id: string;
  name: string;
  isGroup: boolean;
  isGroupAdmin: boolean;
}

type CallState = 'idle' | 'initiating' | 'receiving' | 'connected';

const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

const ChatPage: React.FC<ChatPageProps> = ({ user, token, onLogout, onNavigate }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [previewingFile, setPreviewingFile] = useState<Message['file'] | null>(null);

  // --- WebRTC State ---
  const [callState, setCallState] = useState<CallState>('idle');
  const [incomingCallFrom, setIncomingCallFrom] = useState<string | null>(null);
  const [callLogs, setCallLogs] = useState<string[]>([]);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const incomingOfferRef = useRef<any>(null);

  const addLog = useCallback((log: string) => {
    const timestamp = new Date().toLocaleTimeString('ru-RU');
    setCallLogs(prev => [...prev, `[${timestamp}] ${log}`]);
  }, []);

  const resetCallState = useCallback(() => {
    addLog("Завершение сеанса вызова.");
    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
    }
    setRemoteStream(null);
    setCallState('idle');
    setIncomingCallFrom(null);
    incomingOfferRef.current = null;
    // Keep logs for review until the next call starts
  }, [addLog]);

  const { sendSignalingMessage } = useWebSocket(token, (message: ApiMessage & { from?: string; data?: any; }) => {
    if (message.data) {
      try {
        const signal = JSON.parse(message.data);
        const from = message.from;

        if (signal.type === 'offer') {
          // ❗️ Получили offer, только сохраняем — ждём "принять"
          if (callState === 'idle') {
            addLog(`Входящий вызов от ${from}`);
            incomingOfferRef.current = signal;
            setIncomingCallFrom(from);
            setCallState('receiving');
          } else {
            addLog(`Получен offer от ${from}, но звонок уже идёт — игнорируем`);
          }
          return;
        }

        // ❗️ ВНИМАНИЕ: дальше — только если соединение уже принято!
        if (peerConnectionRef.current && callState !== 'idle') {
          if (signal.type === 'answer') {
            addLog("Ответ получен, устанавливаем удаленное описание.");
            peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
          } else if (signal.candidate) {
            addLog("Получен ICE-кандидат.");
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else if (signal.type === 'hangup') {
            addLog("Собеседник завершил вызов.");
            resetCallState();
          }
        }
      } catch (e) {
        console.warn("Не удалось обработать signaling-сообщение:", e);
      }
      return;
    }

    // 🎯 Это обычное сообщение (чат)
    if (message.timestamp) {
      const isGroup = 'groupId' in message && message.groupId;
      const chatId = isGroup
        ? message.groupId
        : (message.sender === user.username ? message.receiver : message.sender);

      const processedMessage: Message = {
        id: `${message.sender}-${message.timestamp}`,
        sender: message.sender,
        receiver: message.receiver,
        content: message.content ?? null,
        audioFileId: message.audio_url?.split('/').pop() || undefined,
        file: message.file_id ? { id: message.file_id, name: message.filename || 'Загруженный файл' } : undefined,
        timestamp: new Date(message.timestamp).getTime(),
        isSentByMe: message.sender === user.username,
      };

      setMessages(prev => {
        const existing = prev[chatId] || [];
        if (existing.some(m => m.id === processedMessage.id)) return prev;
        return {
          ...prev,
          [chatId]: [...existing, processedMessage].sort((a, b) => a.timestamp - b.timestamp)
        };
      });
    }
  });

  const createPeerConnection = useCallback((targetUsername: string) => {
    if (peerConnectionRef.current) {
        addLog("PeerConnection уже существует. Переиспользуем.");
        return peerConnectionRef.current;
    }

    addLog("Создание нового PeerConnection.");
    const pc = new RTCPeerConnection(configuration);

    pc.onicecandidate = (event) => {
      if (event.candidate && callState === 'connected') {
        addLog("Отправка ICE-кандидата.");
        sendSignalingMessage(targetUsername, { candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
        addLog("Получен удаленный медиа-поток.");
        setRemoteStream(event.streams[0]);
    };

    pc.oniceconnectionstatechange = () => {
        if(pc.iceConnectionState) {
            addLog(`Состояние ICE: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'connected') {
                setCallState('connected');
            }
             if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
                resetCallState();
             }
        }
    };
    
    peerConnectionRef.current = pc;
    return pc;
  }, [addLog, sendSignalingMessage, resetCallState, callState]);
  
  const initiateCall = useCallback(async () => {
    if (!activeChat || activeChat.isGroup) return;
    setCallLogs([]); // Clear logs for new call
    addLog("Инициализация вызова...");
    setCallState('initiating');

    try {
        addLog("Запрос доступа к микрофону...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        addLog("Доступ к микрофону получен.");

        const pc = createPeerConnection(activeChat.id);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        addLog("Создание SDP offer...");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        addLog("Отправка offer...");
        sendSignalingMessage(activeChat.id, offer);

    } catch (err: any) {
        addLog(`Ошибка: ${err.message}`);
        console.error("Call initiation failed:", err);
        resetCallState();
    }
  }, [activeChat, addLog, createPeerConnection, sendSignalingMessage, resetCallState]);

  const answerCall = useCallback(async () => {
    if (!incomingCallFrom || !incomingOfferRef.current) return;
    addLog(`Принятие вызова от ${incomingCallFrom}...`);
    setCallState('connected');

    try {
        addLog("Запрос доступа к микрофону...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        addLog("Доступ к микрофону получен.");

        const pc = createPeerConnection(incomingCallFrom);
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        
        addLog("Установка удаленного описания (offer)...");
        await pc.setRemoteDescription(new RTCSessionDescription(incomingOfferRef.current));

        addLog("Создание SDP answer...");
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        addLog("Отправка answer...");
        sendSignalingMessage(incomingCallFrom, answer);
        
        setIncomingCallFrom(null);
        incomingOfferRef.current = null;

    } catch(err: any) {
        addLog(`Ошибка: ${err.message}`);
        console.error("Answering call failed:", err);
        resetCallState();
    }
  }, [incomingCallFrom, addLog, createPeerConnection, sendSignalingMessage, resetCallState]);

  const endCall = useCallback(() => {
    const target = activeChat?.id || incomingCallFrom;
    if (target) {
        sendSignalingMessage(target, { type: 'hangup' });
    }
    resetCallState();
  }, [activeChat, incomingCallFrom, sendSignalingMessage, resetCallState]);

  const declineCall = useCallback(() => {
     if (incomingCallFrom) {
        addLog(`Вызов от ${incomingCallFrom} отклонен.`);
        sendSignalingMessage(incomingCallFrom, { type: 'hangup' });
    }
    resetCallState();
  }, [incomingCallFrom, addLog, sendSignalingMessage, resetCallState]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizing && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      let newWidth = e.clientX - containerRect.left;
      
      const minWidth = 180;
      const maxWidth = containerRect.width - 400;

      if (newWidth < minWidth) newWidth = minWidth;
      if (newWidth > maxWidth) newWidth = maxWidth;

      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const fetchInitialData = useCallback(async () => {
     if (!token || !user.username) return;
     try {
        setIsLoading(true);
        setError(null);
        const [friendsData, groupsData] = await Promise.all([
            api.getFriends(token),
            api.getGroups(token, user.username),
        ]);
        setContacts(friendsData);
        setGroups(groupsData);
     } catch (err: any) {
        if (err.message === 'AUTH_FAILURE') {
            console.error("Authentication error, logging out.");
            onLogout();
            return;
        }
        setError(err.message || 'Не удалось загрузить данные.');
        console.error(err);
     } finally {
        setIsLoading(false);
     }
  }, [token, onLogout, user.username]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    setError(null); 
    if (!activeChat || !token) {
      return;
    }
    
    const fetchMessageHistory = async () => {
      try {
        setIsMessagesLoading(true);
        let chatMessages: ApiMessage[];

        if (activeChat.isGroup) {
          chatMessages = await api.getGroupMessages(token, activeChat.id);
        } else {
          const history: ApiMessage[] = await api.getMessages(token);
          chatMessages = history.filter(
            msg => (msg.sender === user.username && msg.receiver === activeChat.id) || (msg.sender === activeChat.id && msg.receiver === user.username)
          );
        }

        const processedMessages: Message[] = chatMessages.map((msg): Message => ({
              id: `${msg.sender}-${msg.timestamp}`,
              sender: msg.sender,
              receiver: msg.receiver,
              content: msg.content ?? null,
              audioFileId: msg.audio_url?.split('/').pop() || undefined,
              file: msg.file_id ? { id: msg.file_id, name: msg.filename || 'Загруженный файл' } : undefined,
              timestamp: new Date(msg.timestamp).getTime(),
              isSentByMe: msg.sender === user.username,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
          
        setMessages(prev => ({
          ...prev,
          [activeChat.id]: processedMessages,
        }));
      } catch (err: any) {
        if (err.message === 'AUTH_FAILURE') onLogout();
        setError('Не удалось загрузить историю сообщений.');
        console.error(err);
      } finally {
        setIsMessagesLoading(false);
      }
    };
    
    fetchMessageHistory();
  }, [activeChat, token, user.username, onLogout]);


  const handleSendMessage = async (payload: { content?: string; audioFile?: File }) => {
    if (!activeChat || !token) return;
    if (!payload.content && !payload.audioFile) return;

    setError(null);

    let optimisticMessage: Message;
    let audioBlobUrl: string | undefined;

    if (payload.content) {
        optimisticMessage = {
            id: `${user.username}-${Date.now()}`, sender: user.username, receiver: activeChat.id,
            content: payload.content, timestamp: Date.now(), isSentByMe: true,
        };
    } else if (payload.audioFile) {
        audioBlobUrl = URL.createObjectURL(payload.audioFile);
        optimisticMessage = {
            id: `${user.username}-${Date.now()}`, sender: user.username, receiver: activeChat.id, content: null,
            audioUrl: audioBlobUrl, timestamp: Date.now(), isSentByMe: true,
        };
    } else {
        return;
    }
    
    setMessages(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), optimisticMessage],
    }));

    try {
        const apiPayload = {
            ...payload, ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiver: activeChat.id })
        };
        await api.sendMessage(token, apiPayload);
    } catch (err: any) {
        setError(err.message || "Не удалось отправить сообщение.");
        console.error("Ошибка отправки сообщения:", err);
        setMessages(prev => ({ ...prev, [activeChat.id]: (prev[activeChat.id] || []).filter(msg => msg.id !== optimisticMessage.id) }));
        if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    }
  };

  const handleSendFile = async (payload: { file?: File; fileId?: string; fileName?: string; }) => {
    if (!activeChat || !token) return;
    if (!payload.file && !payload.fileId) return;

    setError(null);

    const fileInfo = payload.file 
        ? { id: `temp-${Date.now()}`, name: payload.file.name }
        : { id: payload.fileId!, name: payload.fileName! };
    
    const optimisticMessage: Message = {
        id: fileInfo.id,
        sender: user.username,
        receiver: activeChat.id,
        content: null,
        file: fileInfo,
        timestamp: Date.now(),
        isSentByMe: true,
    };
    
    setMessages(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), optimisticMessage],
    }));

    try {
        const apiPayload = {
            ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiver: activeChat.id }),
            file: payload.file,
            fileId: payload.fileId
        };
        await api.sendFile(token, apiPayload);
        setIsAttachmentModalOpen(false); // Close modal on success
    } catch (err: any) {
        setError(err.message || "Не удалось отправить файл.");
        console.error("Ошибка отправки файла:", err);
        setMessages(prev => ({ ...prev, [activeChat.id]: (prev[activeChat.id] || []).filter(msg => msg.id !== optimisticMessage.id) }));
        throw err; // Re-throw error for the modal to catch
    }
  };

  const addContact = async (friendUsername: string) => {
    if (contacts.some(c => c.username === friendUsername) || friendUsername === user.username) {
      alert('Контакт уже существует или вы пытаетесь добавить себя.');
      return;
    }
    try {
      await api.addFriend(token, friendUsername);
      setContacts(await api.getFriends(token));
      setIsAddContactModalOpen(false);
    } catch (err: any) {
      if (err.message === 'AUTH_FAILURE') onLogout();
      else alert(err.message || 'Не удалось добавить контакт.');
    }
  };
  
  const handleCreateGroup = async (name: string) => {
    try {
      const { invite_key } = await api.createGroup(token, name);
      alert(`Группа "${name}" создана! Ключ для приглашения: ${invite_key}`);
      await fetchInitialData();
      setIsGroupModalOpen(false);
    } catch (err: any) {
        throw err;
    }
  };

  const handleAddMember = async (inviteKey: string, username: string) => {
    if (!inviteKey.trim() || !username.trim()) return;
    try {
        await api.addGroupMember(token, inviteKey, username);
        alert(`Пользователь "${username}" добавлен в группу.`);
        setIsGroupModalOpen(false);
    } catch (err: any) { 
        throw err;
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat) return;
    const { id, isGroup, name } = activeChat;
    const confirmMessage = isGroup ? `Удалить группу "${name}"?` : `Удалить чат с "${name}"?`;

    if (window.confirm(confirmMessage)) {
        try {
            if (isGroup) await api.deleteGroup(token, id);
            setActiveChat(null);
            if (isGroup) setGroups(prev => prev.filter(g => g.id !== id));
            else setContacts(prev => prev.filter(c => c.username !== id));
            setMessages(prev => { const newMessages = { ...prev }; delete newMessages[id]; return newMessages; });
        } catch (err: any) {
            alert(err.message || "Не удалось удалить чат/группу.");
            await fetchInitialData();
        }
    }
  };

  return (
    <div ref={containerRef} className="flex h-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary overflow-hidden">
      <div 
        style={{ width: `${sidebarWidth}px` }} 
        className="flex-shrink-0"
      >
        <ContactList
          contacts={contacts}
          groups={groups}
          activeChat={activeChat}
          onSelectChat={setActiveChat}
          onAddContact={() => setIsAddContactModalOpen(true)}
          onOpenGroupModal={() => setIsGroupModalOpen(true)}
          isLoading={isLoading}
          error={error}
        />
      </div>
      
      <div
        onMouseDown={handleMouseDown}
        className="w-1.5 cursor-col-resize bg-gray-200 dark:bg-gray-700 hover:bg-soviet-red transition-colors duration-200 flex-shrink-0"
        aria-label="Resize panel"
        role="separator"
      />

      <div className="flex-1 min-w-0">
         <ChatWindow
            activeChatInfo={activeChat || (incomingCallFrom ? { id: incomingCallFrom, name: incomingCallFrom, isGroup: false, isGroupAdmin: false } : null)}
            messages={activeChat ? messages[activeChat.id] || [] : []}
            onSendMessage={handleSendMessage}
            isLoading={isMessagesLoading}
            onDeleteChat={handleDeleteChat}
            error={error}
            onAttachmentClick={() => setIsAttachmentModalOpen(true)}
            onOpenFilePreview={setPreviewingFile}
            // WebRTC props
            callState={callState}
            remoteStream={remoteStream}
            callLogs={callLogs}
            onStartCall={initiateCall}
            onEndCall={endCall}
            onAcceptCall={answerCall}
            onDeclineCall={declineCall}
          />
      </div>

      {isAddContactModalOpen && <AddContactModal onClose={() => setIsAddContactModalOpen(false)} onAddContact={addContact} />}
      {isGroupModalOpen && <GroupModal onClose={() => setIsGroupModalOpen(false)} onCreateGroup={handleCreateGroup} onAddMember={handleAddMember} />}
      {isAttachmentModalOpen && activeChat && (
        <AttachmentModal
            onClose={() => setIsAttachmentModalOpen(false)}
            onSendFile={handleSendFile}
            user={user}
            token={token}
            activeChat={activeChat}
        />
      )}
      {previewingFile && (
        <FilePreviewModal
          file={previewingFile}
          onClose={() => setPreviewingFile(null)}
          token={token}
          user={user}
        />
      )}
    </div>
  );
};

export default ChatPage;