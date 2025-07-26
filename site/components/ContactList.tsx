import React, { useState } from 'react';
import type { Contact, Group } from '../types';

interface ActiveChatInfo {
  id: string;
  name: string;
  isGroup: boolean;
  isGroupAdmin: boolean;
}

interface ContactListProps {
  contacts: Contact[];
  groups: Group[];
  activeChat: ActiveChatInfo | null;
  onSelectChat: (chatInfo: ActiveChatInfo) => void;
  onAddContact: () => void;
  onOpenGroupModal: () => void;
  isLoading: boolean;
  error: string | null;
}

const AddUserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
);

const GroupIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.124-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.653.124-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 4h8a2 2 0 012 2v8a2 2 0 01-2 2H8a2 2 0 01-2-2v-8a2 2 0 012-2z" />
    </svg>
);


const ContactList: React.FC<ContactListProps> = ({ contacts, groups, activeChat, onSelectChat, onAddContact, onOpenGroupModal, isLoading, error }) => {
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const selectAndLog = (chatInfo: ActiveChatInfo) => {
    console.log('%c[DEBUG] ContactList: Selecting chat.', 'color: #339933; font-weight: bold;', chatInfo);
    onSelectChat(chatInfo);
  };

  const handleCopyKey = (e: React.MouseEvent, key: string, groupId: string) => {
      e.stopPropagation(); // Prevent chat selection
      navigator.clipboard.writeText(key).then(() => {
        setCopiedKeyId(groupId);
        setTimeout(() => setCopiedKeyId(null), 2000); // Reset after 2 seconds
      }).catch(err => {
        console.error('Failed to copy key: ', err);
        alert('Не удалось скопировать ключ.');
      });
    };

  return (
    <div className="bg-light-secondary dark:bg-dark-secondary flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
        <h2 className="text-xl font-bold uppercase tracking-wider">Контакты</h2>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
            <p className="text-gray-500 dark:text-gray-400 text-center p-4">Загрузка контактов...</p>
        ) : error ? (
            <p className="text-soviet-red text-center p-4">{error}</p>
        ) : contacts.length === 0 && groups.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center p-4">Добавьте свой первый контакт, чтобы начать общение.</p>
        ) : (
          <>
            {contacts.map(contact => (
            <div
                key={contact.username}
                onClick={() => selectAndLog({ id: contact.username, name: contact.username, isGroup: false, isGroupAdmin: false })}
                className={`p-3 rounded-md mb-1 cursor-pointer border-l-4 transition-colors ${activeChat?.id === contact.username ? 'bg-gray-200 dark:bg-gray-700 border-soviet-red' : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-800'}`}
            >
                <p className="font-bold">{contact.username}</p>
            </div>
            ))}
            
            {groups.length > 0 && (
              <>
                <div className="my-2 border-t border-gray-200 dark:border-gray-700"></div>
                <h3 className="px-1 py-1 text-xs font-bold uppercase text-gray-500 dark:text-gray-400 tracking-wider">Группы</h3>
                {groups.map(group => (
                    <div
                        key={group.id}
                        onClick={() => selectAndLog({ id: group.id, name: group.name, isGroup: true, isGroupAdmin: group.is_admin })}
                        className={`p-3 rounded-md mb-1 cursor-pointer border-l-4 transition-colors ${activeChat?.id === group.id ? 'bg-gray-200 dark:bg-gray-700 border-soviet-red' : 'border-transparent hover:bg-gray-200 dark:hover:bg-gray-800'}`}
                    >
                         <div className="flex justify-between items-center w-full">
                            <p className="font-bold truncate pr-2" title={group.name}>{group.name}</p>
                            <div 
                                className="group/copy flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:text-soviet-red"
                                onClick={(e) => handleCopyKey(e, group.inviteKey, group.id)}
                                title="Скопировать ключ приглашения"
                            >
                                <code className="bg-gray-200 dark:bg-gray-800 px-1.5 py-0.5 rounded group-hover/copy:text-soviet-red">{group.inviteKey}</code>
                                <div className="w-4 h-4 flex items-center justify-center">
                                    {copiedKeyId === group.id ? (
                                        <span className="text-green-500 font-bold">✓</span>
                                    ) : (
                                        <CopyIcon />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onAddContact}
              className="flex-1 bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-2 uppercase tracking-wider flex items-center justify-center text-xs transition-colors duration-200 rounded-md"
            >
              <AddUserIcon />
              <span className="ml-2">Добавить</span>
            </button>
            <button
              onClick={onOpenGroupModal}
              className="flex-1 bg-gray-500 hover:bg-gray-600 dark:bg-gray-600 dark:hover:bg-gray-700 text-white font-bold py-2 px-2 uppercase tracking-wider flex items-center justify-center text-xs transition-colors duration-200 rounded-md"
            >
              <GroupIcon />
              <span className="ml-2">Группа</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default ContactList;