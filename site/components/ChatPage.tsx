
import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, Contact, ApiMessage, Group } from '../types';
import { api } from '../services/apiService';
import ContactList from './ContactList';
import ChatWindow from './ChatWindow';
import AddContactModal from './AddContactModal';
import GroupModal from './GroupModal';

interface ChatPageProps {
  user: { username:string };
  token: string;
  onLogout: () => void;
}

interface ActiveChat {
  id: string;
  name: string;
  isGroup: boolean;
  isGroupAdmin: boolean;
}

const ChatPage: React.FC<ChatPageProps> = ({ user, token, onLogout }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<{ [key: string]: Message[] }>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<number | null>(null);

  // --- DEBUG LOGGING ---
  useEffect(() => {
    console.log('%c[DEBUG] ChatPage: `activeChat` state changed to:', 'color: #00AACC; font-weight: bold;', activeChat);
  }, [activeChat]);
  // --- END DEBUG LOGGING ---

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

  // Fetch message history and poll for new messages
  useEffect(() => {
    console.log('%c[DEBUG] ChatPage: Polling useEffect triggered. Current activeChat:', 'color: #9933CC;', activeChat);
    setError(null); // Clear errors from previous chat
    if (pollingIntervalRef.current) {
      console.log('%c[DEBUG] ChatPage: Clearing previous polling interval.', 'color: #9933CC;');
      clearInterval(pollingIntervalRef.current);
    }

    if (!activeChat || !token) {
       console.log('%c[DEBUG] ChatPage: Polling useEffect stopped. No active chat or token.', 'color: #9933CC;');
      return;
    }
    
    console.log(`%c[DEBUG] ChatPage: Starting to fetch messages for chat ID: ${activeChat.id}`, 'color: #9933CC; font-weight: bold;');
    const fetchAndProcessMessages = async () => {
      try {
        let chatMessages: ApiMessage[];

        if (activeChat.isGroup) {
          // Fetch messages for the specific group
          chatMessages = await api.getGroupMessages(token, activeChat.id);
        } else {
          // Fetch all direct messages and filter for the specific conversation
          const history: ApiMessage[] = await api.getMessages(token);
          chatMessages = history.filter(
            msg => (msg.sender === user.username && msg.receiver === activeChat.id) || (msg.sender === activeChat.id && msg.receiver === user.username)
          );
        }

        const processedMessages: Message[] = chatMessages.map((msg): Message => {
            // Extract file ID from the backend URL path like /files/xxxxxxxx
            const audioFileId = msg.audio_url?.split('/').pop() || undefined;
            
            return {
              id: `${msg.sender}-${msg.timestamp}`,
              sender: msg.sender,
              receiver: msg.receiver,
              content: msg.content ?? null,
              audioFileId: audioFileId, // Pass ID to the player
              timestamp: new Date(msg.timestamp).getTime(),
              isSentByMe: msg.sender === user.username,
            };
          })
          .sort((a, b) => a.timestamp - b.timestamp);
          
        setMessages(prev => ({
          ...prev,
          [activeChat.id]: processedMessages,
        }));

      } catch (err: any) {
        if (err.message === 'AUTH_FAILURE') {
          console.error("Authentication error, logging out.");
          onLogout();
          return;
        }
        setError('Не удалось загрузить историю сообщений.');
        console.error(err);
      }
    };

    setIsMessagesLoading(true);
    fetchAndProcessMessages().finally(() => setIsMessagesLoading(false));

    pollingIntervalRef.current = window.setInterval(fetchAndProcessMessages, 3000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [activeChat, token, user.username, onLogout]);


  const handleSendMessage = async (payload: { content?: string; audioFile?: File }) => {
    console.log('%c[DEBUG] ChatPage: handleSendMessage triggered.', 'color: #FF6600; font-weight: bold;');
    console.log('%c[DEBUG] ChatPage: Current activeChat state:', 'color: #FF6600;', activeChat);

    if (!activeChat || !token) {
        console.error('%c[ERROR] ChatPage: handleSendMessage failed. No active chat or token.', 'color: red; font-weight: bold;', { activeChat, token: !!token });
        return;
    }
    if (!payload.content && !payload.audioFile) return;

    setError(null);

    let optimisticMessage: Message;
    let audioBlobUrl: string | undefined;

    if (payload.content) {
        optimisticMessage = {
            id: `${user.username}-${Date.now()}`,
            sender: user.username,
            receiver: activeChat.id,
            content: payload.content,
            timestamp: Date.now(),
            isSentByMe: true,
        };
    } else if (payload.audioFile) {
        audioBlobUrl = URL.createObjectURL(payload.audioFile);
        optimisticMessage = {
            id: `${user.username}-${Date.now()}`,
            sender: user.username,
            receiver: activeChat.id,
            content: null,
            audioUrl: audioBlobUrl,
            timestamp: Date.now(),
            isSentByMe: true,
        };
    } else {
        return; // Should not happen
    }
    
    setMessages(prev => ({
        ...prev,
        [activeChat.id]: [...(prev[activeChat.id] || []), optimisticMessage],
    }));

    try {
        const apiPayload: { receiver?: string; groupId?: string; content?: string; audioFile?: File; } = {
            ...payload,
            ...(activeChat.isGroup ? { groupId: activeChat.id } : { receiver: activeChat.id })
        };
        
        console.log('%c[DEBUG] ChatPage: Constructed apiPayload:', 'color: #FF6600;', apiPayload);
        
        if (!apiPayload.groupId && !apiPayload.receiver) {
             console.error('%c[FATAL] ChatPage: apiPayload constructed WITHOUT receiver or groupId! This is the root cause.', 'color: red; font-weight: bold;', { apiPayload, activeChat });
        }
        
        await api.sendMessage(token, apiPayload);
        // On success, polling will handle the final state. 
        // For voice message, polling will replace the blob url.
    } catch (err: any) {
        const errorMessage = err.message || "Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.";
        console.error("Ошибка отправки сообщения:", err);
        setError(errorMessage);
      
        // Revert optimistic update on failure
        setMessages(prev => {
            const chatMessages = prev[activeChat.id] || [];
            return {
                ...prev,
                [activeChat.id]: chatMessages.filter(msg => msg.id !== optimisticMessage.id)
            }
        });
        
        if (audioBlobUrl) {
            URL.revokeObjectURL(audioBlobUrl);
        }
    }
  };
  
  const addContact = async (friendUsername: string) => {
    if (contacts.some(c => c.username === friendUsername)) {
      alert('Контакт с таким именем уже существует.');
      return;
    }
    if (friendUsername === user.username) {
        alert('Вы не можете добавить себя в друзья.');
        return;
    }

    try {
      await api.addFriend(token, friendUsername);
      const data = await api.getFriends(token);
      setContacts(data);
      setIsModalOpen(false);
    } catch (err: any) {
      if (err.message === 'AUTH_FAILURE') {
        onLogout();
        return;
      }
      alert(err.message || 'Не удалось добавить контакт.');
    }
  };
  
  const handleCreateGroup = async (name: string) => {
    try {
      const { invite_key } = await api.createGroup(token, name);
      alert(`Группа "${name}" успешно создана!\n\nКлюч для приглашения: ${invite_key}\n\nСохраните этот ключ, чтобы поделиться им с другими для добавления в группу.`);
      await fetchInitialData();
      setIsGroupModalOpen(false);
    } catch (err: any) {
        alert(err.message || 'Не удалось создать группу.');
    }
  };

  const handleAddMember = async (inviteKey: string, username: string) => {
    if (!inviteKey.trim() || !username.trim()) {
      alert('Ключ группы и имя пользователя не могут быть пустыми.');
      return;
    }
    try {
        await api.addGroupMember(token, inviteKey, username);
        alert(`Пользователь "${username}" успешно добавлен в группу.`);
        setIsGroupModalOpen(false);
    } catch (err: any) {
        alert(err.message || 'Не удалось добавить участника.');
    }
  };

  const handleDeleteChat = async () => {
    if (!activeChat) return;

    const idToDelete = activeChat.id;
    const isGroup = activeChat.isGroup;
    const chatName = activeChat.name;
    const confirmMessage = isGroup
      ? `Вы уверены, что хотите удалить группу "${chatName}"? Это действие необратимо.`
      : `Вы уверены, что хотите удалить этот чат с "${chatName}"? Вся история сообщений будет безвозвратно удалена.`;

    if (window.confirm(confirmMessage)) {
        try {
            if (isGroup) {
                // Perform the API call first to ensure it succeeds before changing the UI.
                await api.deleteGroup(token, idToDelete);
            }
            // For DMs, there's no API call specified, so it remains a client-side removal.
            
            // On successful deletion (or for client-side only removal), update the UI state.
            setActiveChat(null);
            
            if (isGroup) {
                setGroups(prev => prev.filter(g => g.id !== idToDelete));
            } else {
                setContacts(prev => prev.filter(c => c.username !== idToDelete));
            }
            
            setMessages(prev => {
                const newMessages = { ...prev };
                delete newMessages[idToDelete];
                return newMessages;
            });
        } catch (err: any) {
            alert(err.message || "Не удалось удалить чат/группу.");
            // On failure, re-fetch data to ensure UI is in sync with the server.
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
          onAddContact={() => setIsModalOpen(true)}
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
            activeChatInfo={activeChat}
            messages={messages[activeChat?.id || ''] || []}
            onSendMessage={handleSendMessage}
            isLoading={isMessagesLoading}
            onDeleteChat={handleDeleteChat}
            error={error}
          />
      </div>

      {isModalOpen && (
        <AddContactModal
          onClose={() => setIsModalOpen(false)}
          onAddContact={addContact}
        />
      )}

      {isGroupModalOpen && (
        <GroupModal
          onClose={() => setIsGroupModalOpen(false)}
          onCreateGroup={handleCreateGroup}
          onAddMember={handleAddMember}
        />
      )}
    </div>
  );
};

export default ChatPage;