import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/apiService';
import type { ApiFile } from '../types';
import type { ActiveChat } from './ChatPage';

interface AttachmentModalProps {
  onClose: () => void;
  onSendFile: (payload: { file?: File; fileId?: string; fileName?: string }) => Promise<void>;
  user: { username: string };
  token: string;
  activeChat: ActiveChat;
}

const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const LoadingSpinner = () => (
    <div className="absolute inset-0 bg-light-secondary/80 dark:bg-dark-secondary/80 flex items-center justify-center z-10">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-soviet-red rounded-full animate-spin"></div>
    </div>
);


const AttachmentModal: React.FC<AttachmentModalProps> = ({ onClose, onSendFile, user, token, activeChat }) => {
    const [files, setFiles] = useState<ApiFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchFiles = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedFiles = await api.getFiles(token, user.username);
                setFiles(fetchedFiles);
            } catch (err: any) {
                setError(err.message || 'Не удалось загрузить файлы.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchFiles();
    }, [token, user.username]);

    const handleSendExistingFile = async (file: ApiFile) => {
        setError(null);
        try {
            await onSendFile({ fileId: file.file_id, fileName: file.filename });
        } catch(err: any) {
            setError(err.message || 'Не удалось отправить файл');
        }
    };

    const handleUploadAndSend = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setError(null);
        setIsUploading(true);
        try {
            await onSendFile({ file });
            // onSendFile closes the modal on success
        } catch (err: any) {
            setError(err.message || 'Не удалось загрузить и отправить файл.');
        } finally {
            setIsUploading(false);
        }
        
        // Reset input to allow re-uploading the same file
        if(event.target) event.target.value = '';
    };

    const triggerFileUpload = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-lg shadow-lg w-full max-w-lg h-[80vh] flex flex-col border-2 border-soviet-red text-dark-primary dark:text-light-primary">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleUploadAndSend}
                    className="hidden"
                    accept="*"
                />
                <h2 className="text-2xl font-bold mb-2 text-center uppercase tracking-wider">Прикрепить файл</h2>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-4">Выберите файл из вашего хранилища или загрузите новый.</p>
                
                {error && (
                    <div className="bg-soviet-red/20 border border-soviet-red text-soviet-red px-3 py-2 rounded-md mb-3 text-sm">
                        <strong>Ошибка:</strong> {error}
                    </div>
                )}
                
                <div className="flex-1 overflow-y-auto border-y border-gray-200 dark:border-gray-700 pr-2 relative">
                    {isUploading && <LoadingSpinner />}
                    {isLoading ? (
                        <p className="text-center text-gray-500 p-8">Загрузка файлов...</p>
                    ) : files.length > 0 ? (
                        <ul className="space-y-2 py-4">
                            {files.map(file => (
                                <li key={file.file_id} className="flex items-center justify-between p-3 rounded-md bg-light-primary dark:bg-dark-primary group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <FileIcon />
                                        <span className="truncate" title={file.filename}>{file.filename}</span>
                                    </div>
                                    <button
                                        onClick={() => handleSendExistingFile(file)}
                                        className="flex-shrink-0 flex items-center gap-1.5 text-sm bg-soviet-red text-white font-bold py-1 px-3 uppercase tracking-wider rounded-md hover:bg-red-700 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    >
                                        <SendIcon />
                                        <span>Отправить</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-8">У вас пока нет сохраненных файлов.</p>
                    )}
                </div>

                <div className="flex-shrink-0 pt-6 flex items-center justify-between">
                     <button
                        onClick={onClose}
                        disabled={isUploading}
                        className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 uppercase tracking-wider rounded-md disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={triggerFileUpload}
                        disabled={isUploading}
                        className="bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider rounded-md flex items-center disabled:bg-gray-500"
                    >
                        <UploadIcon />
                        Загрузить с устройства
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AttachmentModal;