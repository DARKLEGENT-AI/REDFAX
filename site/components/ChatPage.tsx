import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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

const ChatPage: React.FC<ChatPageProps> = ({ user, token, onLogout }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeChat, setActiveChat] = useState<string | null>(null);
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

  const activeChatInfo = useMemo(() => {
    if (!activeChat) return null;
    const contact = contacts.find(c => c.username === activeChat);
    if (contact) return { id: contact.username, name: contact.username, isGroup: false, isGroupAdmin: false };
    const group = groups.find(g => g.id === activeChat);
    if (group) return { id: group.id, name: group.name, isGroup: true, isGroupAdmin: group.is_admin };
    return null;
  }, [activeChat, contacts, groups]);

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
     if (!token) return;
     try {
        setIsLoading(true);
        setError(null);
        const [friendsData, groupsData] = await Promise.all([
            api.getFriends(token),
            api.getGroups(token),
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
  }, [token, onLogout]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Fetch message history and poll for new messages
  useEffect(() => {
    setError(null); // Clear errors from previous chat
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (!activeChat || !token) {
      return;
    }
    
    const fetchAndProcessMessages = async () => {
      try {
        const history: ApiMessage[] = await api.getMessages(token);

        const chatMessages = history.filter(
          msg => (msg.sender === user.username && msg.receiver === activeChat) || (msg.sender === activeChat && msg.receiver === user.username)
        );

        const processedMessages: Message[] = chatMessages.map((msg): Message => {
            return {
              id: `${msg.sender}-${msg.timestamp}`, // Create a unique ID
              sender: msg.sender,
              receiver: msg.receiver,
              content: msg.content,
              timestamp: new Date(msg.timestamp).getTime(),
              isSentByMe: msg.sender === user.username,
            };
          })
          .sort((a, b) => a.timestamp - b.timestamp);
          
        setMessages(prev => ({
          ...prev,
          [activeChat]: processedMessages,
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


  const handleSendMessage = async (content: string) => {
    if (!activeChat || !token) return;

    setError(null);

    const recipient = contacts.find(c => c.username === activeChat) || groups.find(g => g.id === activeChat);
    if (!recipient) {
      setError("Ошибка: Получатель не найден.");
      return;
    }

    const optimisticMessage: Message = {
      id: `${user.username}-${Date.now()}`,
      sender: user.username,
      receiver: activeChat,
      content: content,
      timestamp: Date.now(),
      isSentByMe: true,
    };

    setMessages(prev => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), optimisticMessage],
    }));

    try {
      await api.sendMessage(token, activeChat, content);
    } catch (err: any) {
      console.error("Не удалось отправить сообщение:", err);
      setError(err.message || "Не удалось отправить сообщение. Пожалуйста, попробуйте еще раз.");
      
      // Revert optimistic update on failure
      setMessages(prev => {
          const chatMessages = prev[activeChat] || [];
          return {
              ...prev,
              [activeChat]: chatMessages.filter(msg => msg.id !== optimisticMessage.id)
          }
      });
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

  const handleDeleteChat = async (idToDelete: string) => {
    if (!activeChatInfo) return;

    const isGroup = activeChatInfo.isGroup;
    const chatName = activeChatInfo.name;
    const confirmMessage = isGroup
      ? `Вы уверены, что хотите удалить группу "${chatName}"? Это действие необратимо.`
      : `Вы уверены, что хотите удалить этот чат с "${chatName}"? Вся история сообщений будет безвозвратно удалена.`;

    if (window.confirm(confirmMessage)) {
        setActiveChat(null);
        
        try {
            if (isGroup) {
                await api.deleteGroup(token, idToDelete);
                setGroups(prev => prev.filter(g => g.id !== idToDelete));
            } else {
                // This is a client-side only removal.
                setContacts(prev => prev.filter(c => c.username !== idToDelete));
            }
            
            setMessages(prev => {
                const newMessages = { ...prev };
                delete newMessages[idToDelete];
                return newMessages;
            });
        } catch (err: any) {
            alert(err.message || "Не удалось удалить чат/группу.");
            // Re-fetch to get the correct state from the server on failure
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
            activeChatInfo={activeChatInfo}
            messages={messages[activeChat || ''] || []}
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