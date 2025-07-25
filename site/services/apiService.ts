import type { Contact, ApiMessage, ApiFile, ApiProfile, CalendarEvent, ApiGroup, Group } from '../types';

const API_URL = 'http://127.0.0.1:8000';

const handleNetworkError = (error: unknown): never => {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Не удалось подключиться к серверу. Убедитесь, что сервер запущен и проверьте настройки CORS.');
    }
    if (error instanceof Error) {
        throw error;
    }
    throw new Error('Произошла неизвестная сетевая ошибка.');
};

const handleResponseError = async (response: Response, defaultError: string): Promise<never> => {
    if (response.status === 401 || response.status === 403) {
        throw new Error('AUTH_FAILURE');
    }
    
    let errorMessage = defaultError;
    try {
        const errorData = await response.json();
        if (errorData && typeof errorData.detail === 'string' && errorData.detail) {
            errorMessage = errorData.detail;
        }
    } catch (e) {
    }
    throw new Error(errorMessage);
};

export const api = {
  register: async (username: string, password: string) => {
    try {
        const response = await fetch(`${API_URL}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            password,
          }),
        });
        
        if (!response.ok) {
            await handleResponseError(response, 'Произошла ошибка при регистрации.');
        }
        return response.json();
    } catch (error) {
        handleNetworkError(error);
    }
  },
  login: async (username: string, password: string): Promise<{ access_token: string, token_type: string }> => {
    try {
        const response = await fetch(`${API_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (!response.ok) {
            await handleResponseError(response, 'Неверное имя пользователя или пароль.');
        }
        return response.json();
    } catch (error) {
        handleNetworkError(error);
    }
  },
  getFriends: async (token: string): Promise<Contact[]> => {
    try {
        const response = await fetch(`${API_URL}/friends/list`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            await handleResponseError(response, 'Не удалось загрузить список друзей.');
        }
        const data = await response.json();
        return data.friends || [];
    } catch (error) {
        handleNetworkError(error);
    }
  },
  getMessages: async (token: string): Promise<ApiMessage[]> => {
    try {
        const response = await fetch(`${API_URL}/messages`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            await handleResponseError(response, 'Не удалось загрузить историю сообщений.');
        }
        return await response.json();
    } catch (error) {
        handleNetworkError(error);
    }
  },
  addFriend: async (token: string, friendUsername: string) => {
     try {
        const response = await fetch(`${API_URL}/friends/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ username: friendUsername }),
        });
     
         if (!response.ok) {
            await handleResponseError(response, 'Не удалось добавить друга.');
         }
         return response.json();
     } catch(error) {
        handleNetworkError(error);
     }
  },
  sendMessage: async(token: string, receiver: string, content: string) => {
      try {
        const response = await fetch(`${API_URL}/send`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ receiver, content }),
        });
        if (!response.ok) {
            await handleResponseError(response, 'Не удалось отправить сообщение.');
        }
        return response.json();
      } catch(error) {
          handleNetworkError(error);
      }
  },
  sendVoiceMessage: async (token: string, receiver: string, file: File): Promise<{ message: string; audio_file_id: string; }> => {
    try {
      const formData = new FormData();
      formData.append('receiver', receiver);
      formData.append('file', file, 'voice.mp3');

      const response = await fetch(`${API_URL}/send/voice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось отправить голосовое сообщение.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  getGroups: async (token: string): Promise<Group[]> => {
    try {
        const response = await fetch(`${API_URL}/groups/list`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            await handleResponseError(response, 'Не удалось загрузить список групп.');
        }
        const apiGroups: ApiGroup[] = await response.json();
        return apiGroups.map(g => ({
            id: g.group_id,
            name: g.name,
            is_admin: g.is_admin,
        }));
    } catch (error) {
        handleNetworkError(error);
    }
  },
  createGroup: async (token: string, name: string): Promise<{ group_id: string; invite_key: string; }> => {
    try {
      const response = await fetch(`${API_URL}/groups/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось создать группу.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  addGroupMember: async (token: string, invite_key: string, username: string): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${API_URL}/groups/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_key, username }),
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось добавить участника в группу.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  deleteGroup: async (token: string, groupId: string): Promise<void> => {
     try {
      const response = await fetch(`${API_URL}/groups/${groupId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось удалить группу.');
      }
    } catch (error) {
      handleNetworkError(error);
    }
  },
  uploadFile: async (token: string, userId: string, file: File): Promise<{ file_id: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload?user_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось загрузить файл.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  uploadTextFile: async (token: string, userId: string, file: File): Promise<{ file_id: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload/text?user_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось загрузить текстовый файл.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  updateTextFile: async (token: string, userId: string, fileId: string, content: string, filename: string): Promise<{ new_file_id: string }> => {
    try {
      const file = new File([content], filename, { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload/text/${fileId}?user_id=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось обновить файл.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  getFiles: async (token: string, userId: string): Promise<ApiFile[]> => {
    try {
      const response = await fetch(`${API_URL}/files?user_id=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось получить список файлов.');
      }
      return (await response.json()) || [];
    } catch (error) {
      handleNetworkError(error);
    }
  },
  deleteFile: async (token: string, fileId: string): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${API_URL}/delete/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось удалить файл.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  getFileBlob: async (token: string, fileId: string): Promise<Blob> => {
    try {
      const response = await fetch(`${API_URL}/files/${fileId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось скачать файл.');
      }
      return response.blob();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  getProfile: async (token: string): Promise<ApiProfile> => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось загрузить данные профиля.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  updateProfile: async (token: string, profileData: Partial<ApiProfile>): Promise<{ message: string }> => {
    try {
      const response = await fetch(`${API_URL}/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось обновить профиль.');
      }
      return response.json();
    } catch(error) {
      handleNetworkError(error);
    }
  },
  getTasks: async (token: string): Promise<CalendarEvent[]> => {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось загрузить задачи.');
      }
      const tasks = await response.json();
      return tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        date: task.date,
        description: task.description || '',
      }));
    } catch (error) {
      handleNetworkError(error);
    }
  },
  addTask: async (token: string, taskData: { title: string; date: string; description: string; }): Promise<{ id: string }> => {
    try {
      const { title, date, description } = taskData;
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title, date, description }),
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось добавить задачу.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  deleteTask: async (token: string, taskId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось удалить задачу.');
      }
    } catch (error) {
      handleNetworkError(error);
    }
  },
};