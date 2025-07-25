import React, { useState, useEffect } from 'react';
import type { ApiProfile } from '../types';
import { api } from '../services/apiService';

// --- Editable Field Component ---
interface EditableFieldProps {
    label: string;
    name: string;
    value: string;
    isEditing: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    placeholder?: string;
    isTextarea?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, name, value, isEditing, onChange, placeholder, isTextarea = false }) => {
    const inputClass = "w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md";

    return (
        <div className="py-4 border-b border-gray-200/50 dark:border-gray-700/50 last:border-b-0">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{label}</p>
            {isEditing ? (
                isTextarea ? (
                    <textarea
                        name={name}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className={`${inputClass} text-lg h-24 resize-none`}
                    />
                ) : (
                    <input
                        type="text"
                        name={name}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className={`${inputClass} text-lg`}
                    />
                )
            ) : (
                <p className={`text-lg text-dark-primary dark:text-light-primary ${!value && 'text-gray-500'}`}>
                    {value || placeholder}
                </p>
            )}
        </div>
    );
};

// --- UI State Interface ---
interface ProfileData {
  nickname: string;
  birthDate: string; // Stored as DD.MM.YYYY for UI
  location: string; // "Country, City"
  gender: string;
  languages: string; // "lang1, lang2"
  bio: string;
}

// --- Main Profile Page Component ---
interface ProfilePageProps {
  user: { username: string };
  token: string;
}

// --- Helper Functions ---
const apiToUi = (apiData: ApiProfile): ProfileData => {
  let birthDate = '';
  if (apiData.birth_date) {
    const date = new Date(apiData.birth_date.replace(/-/g, '/')); // Use / to avoid timezone issues
    if (!isNaN(date.getTime())) {
      birthDate = date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  return {
    nickname: apiData.nickname || '',
    birthDate: birthDate,
    location: [apiData.country, apiData.city].filter(Boolean).join(', '),
    gender: apiData.gender || '',
    languages: (apiData.languages || []).join(', '),
    bio: apiData.bio || '',
  };
};

const uiToApi = (uiData: ProfileData): Partial<ApiProfile> => {
  const locationParts = uiData.location.split(',').map(s => s.trim());
  const country = locationParts[0] || undefined;
  const city = locationParts[1] || undefined;

  let birth_date: string | undefined;
  if (uiData.birthDate) {
    const dateParts = uiData.birthDate.split('.');
    if (dateParts.length === 3 && dateParts[0]?.length === 2 && dateParts[1]?.length === 2 && dateParts[2]?.length === 4) {
      const isoDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
      if (!isNaN(new Date(isoDate).getTime())) {
        birth_date = isoDate;
      }
    }
  }

  return {
    nickname: uiData.nickname || undefined,
    birth_date: birth_date,
    country: country,
    city: city,
    gender: uiData.gender || undefined,
    languages: uiData.languages.split(',').map(s => s.trim()).filter(Boolean),
    bio: uiData.bio || undefined,
  };
};


const initialProfileState: ProfileData = {
    nickname: '',
    birthDate: '',
    location: '',
    gender: '',
    languages: '',
    bio: '',
};

const ProfilePage: React.FC<ProfilePageProps> = ({ user, token }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [savedProfileData, setSavedProfileData] = useState<ProfileData>(initialProfileState);
  const [profileData, setProfileData] = useState<ProfileData>(initialProfileState);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.getProfile(token);
        const uiData = apiToUi(data);
        setSavedProfileData(uiData);
        setProfileData(uiData);
      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить профиль.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    if (token) {
        fetchProfile();
    }
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setProfileData(prev => ({...prev, [name]: value}));
  };

  const handleEdit = () => {
      setProfileData(savedProfileData);
      setIsEditing(true);
  };
  
  const handleSave = async () => {
      setError(null);
      setIsSaving(true);
      try {
        const apiPayload = uiToApi(profileData);
        await api.updateProfile(token, apiPayload);
        setSavedProfileData(profileData);
        setIsEditing(false);
      } catch (err: any) {
          setError(err.message || 'Не удалось сохранить профиль.');
      } finally {
          setIsSaving(false);
      }
  };

  const handleCancel = () => {
      setProfileData(savedProfileData);
      setIsEditing(false);
      setError(null);
  };

  const inputHeaderClass = "w-full bg-transparent text-dark-primary dark:text-light-primary border-b border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-0 p-0 outline-none";
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary">
          <p className="mt-4 text-xl tracking-wider uppercase">Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary p-6 md:p-8 h-full overflow-y-auto font-sans">
      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-20 h-20 rounded-full bg-gray-300 dark:bg-gray-600 flex-shrink-0">
            {/* Placeholder for an avatar image */}
          </div>
          <div className="w-full">
            {isEditing ? (
                 <input
                    type="text"
                    name="nickname"
                    value={profileData.nickname}
                    onChange={handleInputChange}
                    placeholder="Ваш псевдоним"
                    className={`text-3xl font-bold ${inputHeaderClass}`}
                  />
            ) : (
                <h1 className="text-3xl font-bold">{savedProfileData.nickname || user.username}</h1>
            )}

            <div className="flex items-center mt-1">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                <p className="text-gray-500 dark:text-gray-400">{user.username}</p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-auto">
            <div className="flex items-center gap-2">
                {isEditing ? (
                    <>
                        <button onClick={handleSave} disabled={isSaving} className="flex-1 md:flex-none bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-6 uppercase tracking-wider text-sm rounded-md disabled:bg-gray-500">
                          {isSaving ? 'Сохранение...' : 'Сохранить'}
                        </button>
                        <button onClick={handleCancel} className="flex-1 md:flex-none bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 uppercase tracking-wider text-sm rounded-md">
                          Отмена
                        </button>
                    </>
                ) : (
                    <button onClick={handleEdit} className="w-full md:w-auto bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-6 uppercase tracking-wider text-sm rounded-md">
                        Редактировать профиль
                    </button>
                )}
            </div>
            {error && <p className="text-soviet-red text-xs italic mt-2 text-right">{error}</p>}
        </div>
      </div>

      {/* --- Main Content --- */}
      <div className="bg-light-secondary dark:bg-dark-secondary p-4 md:p-6 rounded-lg shadow-lg dark:shadow-none">
          <EditableField label="Псевдоним" name="nickname" value={profileData.nickname} isEditing={isEditing} onChange={handleInputChange} placeholder="RedDan" />
          <EditableField label="Дата рождения" name="birthDate" value={profileData.birthDate} isEditing={isEditing} onChange={handleInputChange} placeholder="ДД.ММ.ГГГГ" />
          <EditableField label="Страна, город" name="location" value={profileData.location} isEditing={isEditing} onChange={handleInputChange} placeholder="Russia, Saratov" />
          <EditableField label="Пол" name="gender" value={profileData.gender} isEditing={isEditing} onChange={handleInputChange} placeholder="male" />
          <EditableField label="Языки" name="languages" value={profileData.languages} isEditing={isEditing} onChange={handleInputChange} placeholder="ru, en" />
          <EditableField label="Биография" name="bio" value={profileData.bio} isEditing={isEditing} onChange={handleInputChange} placeholder="Программист и коммунист" isTextarea />
        </div>
    </div>
  );
};

export default ProfilePage;