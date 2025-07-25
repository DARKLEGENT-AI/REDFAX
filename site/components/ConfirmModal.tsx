import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  isLoading = false,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-light-secondary dark:bg-dark-secondary p-8 rounded-lg shadow-lg w-full max-w-md border-2 border-soviet-red text-dark-primary dark:text-light-primary">
        <h2 className="text-2xl font-bold mb-4 text-center uppercase tracking-wider">{title}</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">{message}</p>
        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 uppercase tracking-wider disabled:opacity-50 rounded-md"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-6 uppercase tracking-wider disabled:bg-red-900 rounded-md"
          >
            {isLoading ? 'Обработка...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
