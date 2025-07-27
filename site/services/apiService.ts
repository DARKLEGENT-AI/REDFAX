import type { Contact, ApiMessage, ApiFile, ApiProfile, CalendarEvent, ApiGroup, Group } from '../types';

const API_URL = 'https://redfax-server.loca.lt';

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
          headers: { 
              'Content-Type': 'application/json',
              'bypass-tunnel-reminder': 'true' 
          },
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
            headers: { 
                'Content-Type': 'application/json',
                'bypass-tunnel-reminder': 'true'
            },
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
            headers: { 
                'Authorization': `Bearer ${token}`,
                'bypass-tunnel-reminder': 'true'
            }
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
            headers: { 
                'Authorization': `Bearer ${token}`,
                'bypass-tunnel-reminder': 'true'
            }
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
                'bypass-tunnel-reminder': 'true'
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
  sendMessage: async (token: string, payload: { receiver?: string; groupId?: string; content?: string; audioFile?: File }) => {
    try {
        const isGroupMessage = payload.groupId !== undefined;
        const isDirectMessage = payload.receiver !== undefined;

        if (!isGroupMessage && !isDirectMessage) {
            throw new Error('Нужно указать receiver или group_id');
        }
        
        const hasContent = !!payload.content;
        const hasAudio = !!payload.audioFile;

        if (!hasContent && !hasAudio) {
             throw new Error('sendMessage requires either "content" for text or "audioFile" for voice.');
        }

        let endpoint: string;
        let options: RequestInit;

        if (hasContent) {
            // --- TEXT MESSAGE (JSON) ---
            endpoint = `${API_URL}/send/message`;
            const body = {
                content: payload.content!,
                ...(isGroupMessage ? { group_id: payload.groupId } : { receiver: payload.receiver }),
            };
            options = {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}`,
                    'bypass-tunnel-reminder': 'true'
                },
                body: JSON.stringify(body),
            };
        } else {
            // --- VOICE MESSAGE (FormData) ---
            endpoint = `${API_URL}/send/voice`;
            const formData = new FormData();
            formData.append('audio_file', payload.audioFile!, payload.audioFile!.name);
            if (isGroupMessage) {
                formData.append('group_id', payload.groupId!);
            } else {
                formData.append('receiver', payload.receiver!);
            }
            options = {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'bypass-tunnel-reminder': 'true'
                },
                body: formData,
            };
        }

        const response = await fetch(endpoint, options);
        if (!response.ok) {
            await handleResponseError(response, 'Не удалось отправить сообщение.');
        }
        return await response.json();

    } catch (error) {
        handleNetworkError(error);
    }
  },
  /**
   * Sends a file in a message, either by uploading a new one or referencing an existing one.
   * If uploading a new file, server-side limits on file size (50MB) and total file count (20) apply.
   * A 400 Bad Request will be returned if these limits are exceeded.
   */
  sendFile: async (token: string, payload: { receiver?: string; groupId?: string; file?: File; fileId?: string }) => {
    try {
        const isGroupMessage = payload.groupId !== undefined;
        const isDirectMessage = payload.receiver !== undefined;

        if (!isGroupMessage && !isDirectMessage) {
            throw new Error('Нужно указать receiver или group_id');
        }

        const hasNewFile = !!payload.file;
        const hasExistingFileId = !!payload.fileId;

        if (!hasNewFile && !hasExistingFileId) {
            throw new Error('sendFile requires either "file" for a new upload or "fileId" for an existing file.');
        }
        
        const endpoint = `${API_URL}/send/file`;
        const formData = new FormData();

        if (isGroupMessage) {
            formData.append('group_id', payload.groupId!);
        } else {
            formData.append('receiver', payload.receiver!);
        }

        if (hasNewFile) {
            formData.append('file', payload.file!, payload.file!.name);
        } else {
            formData.append('file_id', payload.fileId!);
        }

        const options = {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'bypass-tunnel-reminder': 'true'
            },
            body: formData,
        };
        
        const response = await fetch(endpoint, options);
        if (!response.ok) {
            await handleResponseError(response, 'Не удалось отправить файл.');
        }
        return await response.json();

    } catch (error) {
        handleNetworkError(error);
    }
  },
  getGroupMessages: async (token: string, groupId: string): Promise<ApiMessage[]> => {
    try {
        const response = await fetch(`${API_URL}/group/messages?group_id=${groupId}`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'bypass-tunnel-reminder': 'true'
            }
        });

        if (!response.ok) {
            await handleResponseError(response, 'Не удалось загрузить историю сообщений группы.');
        }
        return await response.json();
    } catch (error) {
        handleNetworkError(error);
    }
  },
  getGroups: async (token: string, currentUsername: string): Promise<Group[]> => {
    try {
        const response = await fetch(`${API_URL}/groups`, {
            method: 'GET',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'bypass-tunnel-reminder': 'true'
            }
        });

        if (!response.ok) {
            await handleResponseError(response, 'Не удалось загрузить список групп.');
        }
        const apiGroups: ApiGroup[] = await response.json();
        return apiGroups.map(g => ({
            id: g.id,
            name: g.name,
            is_admin: g.admin === currentUsername,
            inviteKey: g.invite_key,
        }));
    } catch (error) {
        handleNetworkError(error);
    }
  },
  createGroup: async (token: string, name: string): Promise<{ group_id: string; invite_key: string; }> => {
    try {
      const response = await fetch(`${API_URL}/group`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
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
      const response = await fetch(`${API_URL}/group/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
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
      const response = await fetch(`${API_URL}/group/${groupId}`, {
        method: 'DELETE',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось удалить группу.');
      }
    } catch (error) {
      handleNetworkError(error);
    }
  },
  /**
   * Uploads a file to the user's storage.
   * Note: The server enforces file size and count limits.
   * A 400 Bad Request will be returned with one of the following messages:
   * - `{"detail": "Файл превышает максимальный размер 50 МБ"}` if the file is larger than 50MB.
   * - `{"detail": "Превышено максимальное количество файлов: 20"}` if the user already has 20 files.
   */
  uploadFile: async (token: string, userId: string, file: File): Promise<{ file_id: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/file?user_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
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
  /**
   * Uploads a new text file. This also adheres to the server's file limits.
   * See `uploadFile` for details on specific 400 Bad Request errors.
   */
  uploadTextFile: async (token: string, userId: string, file: File): Promise<{ file_id: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/text?user_id=${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
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
  /**
   * Updates an existing text file by uploading a new version.
   * Note: The server enforces a file size limit of 50MB for the new content.
   * A 400 Bad Request will be returned if the new content exceeds this limit.
   */
  updateTextFile: async (token: string, userId: string, fileId: string, content: string, filename: string): Promise<{ new_file_id: string }> => {
    try {
      const file = new File([content], filename, { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/text/${fileId}?user_id=${encodeURIComponent(userId)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
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
        headers: { 
            Authorization: `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
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
      const response = await fetch(`${API_URL}/file/${fileId}`, {
        method: 'DELETE',
        headers: { 
            Authorization: `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
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
      const response = await fetch(`${API_URL}/file/${fileId}`, {
        method: 'GET',
        headers: { 
            Authorization: `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось скачать файл.');
      }
      return response.blob();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  addSystemFileToUser: async (token: string, fileId: string): Promise<void> => {
    try {
      const response = await fetch(`${API_URL}/files/add_system`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
        },
        body: JSON.stringify({ file_id: fileId }),
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось добавить системный файл.');
      }
    } catch (error) {
      handleNetworkError(error);
    }
  },
  getVoiceMessageBlob: async (token: string, fileId: string): Promise<Blob> => {
    try {
      const response = await fetch(`${API_URL}/voice/${fileId}`, {
        method: 'GET',
        headers: { 
            Authorization: `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось скачать голосовое сообщение.');
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
        headers: { 
            'Authorization': `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        }
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
            'Authorization': `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
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
  getAvatarBlob: async (token: string): Promise<Blob | null> => {
    try {
      const response = await fetch(`${API_URL}/profile/avatar`, {
        method: 'GET',
        headers: { 
            Authorization: `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
      });

      if (response.status === 404) {
        return null; // No avatar found, which is not an error
      }
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось загрузить аватар.');
      }
      return response.blob();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  uploadAvatar: async (token: string, file: File): Promise<{ message: string; avatar_url: string; }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/profile/avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
        },
        body: formData,
      });

      if (!response.ok) {
        await handleResponseError(response, 'Не удалось загрузить аватар.');
      }
      return response.json();
    } catch (error) {
      handleNetworkError(error);
    }
  },
  getTasks: async (token: string): Promise<CalendarEvent[]> => {
    try {
      const response = await fetch(`${API_URL}/tasks`, {
        method: 'GET',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
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
      const response = await fetch(`${API_URL}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'bypass-tunnel-reminder': 'true'
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
      const response = await fetch(`${API_URL}/task/${taskId}`, {
        method: 'DELETE',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'bypass-tunnel-reminder': 'true'
        },
      });
      if (!response.ok) {
        await handleResponseError(response, 'Не удалось удалить задачу.');
      }
    } catch (error) {
      handleNetworkError(error);
    }
  },
};