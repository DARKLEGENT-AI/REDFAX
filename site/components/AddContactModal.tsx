
import React, { useState } from 'react';

interface AddContactModalProps {
  onClose: () => void;
  onAddContact: (username: string) => void;
}

const AddContactModal: React.FC<AddContactModalProps> = ({ onClose, onAddContact }) => {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    
    setIsLoading(true);
    try {
      await onAddContact(username);
    } catch (error) {
      // Error is handled and alerted in the parent component (ChatPage)
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-light-secondary dark:bg-dark-secondary p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-soviet-red text-dark-primary dark:text-light-primary">
        <h2 className="text-2xl font-bold mb-6 text-center uppercase tracking-wider">Добавить контакт</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="contact-username">
              Имя пользователя
            </label>
            <input
              id="contact-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
              required
            />
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 uppercase tracking-wider disabled:opacity-50 rounded-md"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider disabled:bg-red-900 rounded-md"
            >
              {isLoading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddContactModal;
