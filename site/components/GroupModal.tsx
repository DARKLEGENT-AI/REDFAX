import React, { useState } from 'react';

interface GroupModalProps {
  onClose: () => void;
  onAddMember: (key: string, username: string) => Promise<void>;
  onCreateGroup: (name: string) => Promise<void>;
}

const GroupModal: React.FC<GroupModalProps> = ({ onClose, onAddMember, onCreateGroup }) => {
  const [view, setView] = useState<'create' | 'add'>('add');
  
  const [groupName, setGroupName] = useState('');
  const [inviteKey, setInviteKey] = useState('');
  const [username, setUsername] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    
    setIsLoading(true);
    try {
      await onCreateGroup(groupName);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteKey.trim() || !username.trim()) return;
    
    setIsLoading(true);
    try {
      await onAddMember(inviteKey, username);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-light-secondary dark:bg-dark-secondary p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-soviet-red text-dark-primary dark:text-light-primary">
        <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6">
            <button
              onClick={() => setView('add')}
              className={`flex-1 py-2 text-lg uppercase tracking-widest transition-colors ${view === 'add' ? 'text-soviet-red border-b-2 border-soviet-red' : 'text-gray-500 dark:text-gray-400 hover:text-dark-primary dark:hover:text-light-primary'}`}
            >
              Добавить участника
            </button>
            <button
              onClick={() => setView('create')}
              className={`flex-1 py-2 text-lg uppercase tracking-widest transition-colors ${view === 'create' ? 'text-soviet-red border-b-2 border-soviet-red' : 'text-gray-500 dark:text-gray-400 hover:text-dark-primary dark:hover:text-light-primary'}`}
            >
              Создать группу
            </button>
        </div>

        {view === 'create' && (
            <form onSubmit={handleCreate}>
                 <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Создайте новую группу и получите ключ для приглашения других участников.</p>
                 <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="group-name">
                    Название группы
                    </label>
                    <input
                    id="group-name"
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
                    placeholder="Коминтерн"
                    autoFocus
                    required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider disabled:bg-red-900/50 rounded-md transition-colors"
                >
                    {isLoading ? 'Создание...' : 'Создать'}
                </button>
            </form>
        )}

        {view === 'add' && (
             <form onSubmit={handleAddMember}>
                <p className="text-center text-gray-500 dark:text-gray-400 mb-6">Администратор группы может добавить нового участника, используя ключ приглашения.</p>
                <div className="mb-4">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="group-key">
                    Ключ приглашения
                    </label>
                    <input
                    id="group-key"
                    type="text"
                    value={inviteKey}
                    onChange={(e) => setInviteKey(e.target.value)}
                    className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
                    placeholder="Введите ключ..."
                    autoFocus
                    required
                    />
                </div>
                 <div className="mb-6">
                    <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="username-to-add">
                    Имя пользователя
                    </label>
                    <input
                    id="username-to-add"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
                    placeholder="Введите имя пользователя..."
                    required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider disabled:bg-red-900/50 rounded-md transition-colors"
                    >
                    {isLoading ? 'Добавление...' : 'Добавить'}
                </button>
            </form>
        )}
       
        <div className="mt-8 text-center">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-500 dark:text-gray-400 hover:text-soviet-red font-bold uppercase tracking-wider text-sm transition-colors"
            >
              Отмена
            </button>
        </div>
      </div>
    </div>
  );
};

export default GroupModal;