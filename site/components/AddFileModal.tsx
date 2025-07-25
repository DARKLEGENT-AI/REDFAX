
import React, { useState } from 'react';

interface AddFileModalProps {
  onClose: () => void;
  onAddFile: (filename: string) => void;
}

const AddFileModal: React.FC<AddFileModalProps> = ({ onClose, onAddFile }) => {
  const [filename, setFilename] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!filename.trim()) return;
    onAddFile(filename);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-light-secondary dark:bg-dark-secondary p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-soviet-red text-dark-primary dark:text-light-primary">
        <h2 className="text-2xl font-bold mb-6 text-center uppercase tracking-wider">Создать новый файл</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="file-name">
              Имя файла (.txt)
            </label>
            <input
              id="file-name"
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
              placeholder="например, мои_заметки.txt"
              autoFocus
              required
            />
          </div>
          <div className="mb-6">
             <p className="text-sm text-gray-500 dark:text-gray-400">На данный момент поддерживается только создание текстовых файлов (.txt).</p>
          </div>
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 uppercase tracking-wider rounded-md"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider rounded-md"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFileModal;
