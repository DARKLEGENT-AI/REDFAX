import React, { useState, useEffect, useRef } from 'react';
import type { ApiProfile } from '../types';
import { api } from '../services/apiService';

// --- Icons ---

const PlaceholderUserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const LoadingSpinner = () => (
    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- Editable Field Component ---
interface EditableFieldProps {
    label: string;
    name: string;
    value: string;
    isEditing: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    placeholder?: string;
    isTextarea?: boolean;
    type?: string;
}

const EditableField: React.FC<EditableFieldProps> = ({ label, name, value, isEditing, onChange, placeholder, isTextarea = false, type = "text" }) => {
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
                        type={type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        placeholder={placeholder}
                        className={`${inputClass} text-lg`}
                    />
                )
            ) : (
                <p className={`text-lg text-dark-primary dark:text-light-primary min-h-[42px] flex items-center ${!value && 'text-gray-500 italic'}`}>
                    {value || placeholder}
                </p>
            )}
        </div>
    );
};

// --- UI State Interface ---
interface ProfileData {
  firstName: string;
  lastName: string;
  birthDate: string;
  bio: string;
  gender: string;
  city: string;
  country: string;
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
    firstName: apiData.first_name || '',
    lastName: apiData.last_name || '',
    birthDate: birthDate,
    bio: apiData.bio || '',
    gender: apiData.gender || '',
    city: apiData.city || '',
    country: apiData.country || '',
  };
};

const uiToApi = (uiData: ProfileData): Partial<ApiProfile> => {
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
    first_name: uiData.firstName || undefined,
    last_name: uiData.lastName || undefined,
    birth_date: birth_date,
    bio: uiData.bio || undefined,
    gender: uiData.gender || undefined,
    city: uiData.city || undefined,
    country: uiData.country || undefined,
  };
};


const initialProfileState: ProfileData = {
    firstName: '',
    lastName: '',
    birthDate: '',
    bio: '',
    gender: '',
    city: '',
    country: '',
};

const genderMap: { [key: string]: string } = {
    male: 'Мужской',
    female: 'Женский',
    other: 'Другой'
};

const ProfilePage: React.FC<ProfilePageProps> = ({ user, token }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [savedProfileData, setSavedProfileData] = useState<ProfileData>(initialProfileState);
  const [profileData, setProfileData] = useState<ProfileData>(initialProfileState);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const profile = await api.getProfile(token);
        const uiData = apiToUi(profile);
        setSavedProfileData(uiData);
        setProfileData(uiData);

        if (avatarUrlRef.current) {
          URL.revokeObjectURL(avatarUrlRef.current);
          avatarUrlRef.current = null;
        }
        
        // Always try to fetch the avatar, as getAvatarBlob handles 404s gracefully.
        const blob = await api.getAvatarBlob(token);
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          setAvatarUrl(objectUrl);
          avatarUrlRef.current = objectUrl;
        } else {
          setAvatarUrl(null);
        }

      } catch (err: any) {
        setError(err.message || 'Не удалось загрузить профиль.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
        fetchProfileData();
    }
    
    // Cleanup object URL on unmount
    return () => {
        if (avatarUrlRef.current) {
            URL.revokeObjectURL(avatarUrlRef.current);
        }
    }
  }, [token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setProfileData(prev => ({...prev, [name]: value}));
  };
  
  const handleAvatarClick = () => {
    if (!isUploading) {
        fileInputRef.current?.click();
    }
  };
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
        await api.uploadAvatar(token, file);
        // Refetch avatar to display the new one
        const blob = await api.getAvatarBlob(token);
        if (avatarUrlRef.current) {
            URL.revokeObjectURL(avatarUrlRef.current);
        }
        if (blob) {
            const objectUrl = URL.createObjectURL(blob);
            setAvatarUrl(objectUrl);
            avatarUrlRef.current = objectUrl;
        }
    } catch (err: any) {
        setError(err.message || "Не удалось загрузить аватар.");
    } finally {
        setIsUploading(false);
        // Reset file input
        if(e.target) e.target.value = '';
    }
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
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary">
          <p className="mt-4 text-xl tracking-wider uppercase">Загрузка профиля...</p>
      </div>
    );
  }

  return (
    <div className="bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary p-6 md:p-8 h-full overflow-y-auto font-sans">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*"
        disabled={isUploading}
      />

      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-36 h-36 rounded-lg bg-gray-300 dark:bg-gray-600 flex-shrink-0 relative group">
            {isUploading ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 rounded-lg">
                    <LoadingSpinner />
                </div>
            ) : avatarUrl ? (
                <img src={avatarUrl} alt="Аватар пользователя" className="w-full h-full rounded-lg object-cover" />
            ) : (
                <PlaceholderUserIcon />
            )}
            {!isUploading && (
                 <div
                    onClick={handleAvatarClick}
                    className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    role="button"
                    aria-label="Загрузить новый аватар"
                >
                    <UploadIcon />
                </div>
            )}
          </div>
          <div className="w-full">
            <h1 className="text-3xl font-bold">{`${savedProfileData.firstName} ${savedProfileData.lastName}`.trim() || user.username}</h1>
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
          <div className="grid md:grid-cols-2 gap-x-8">
            <EditableField label="Имя" name="firstName" value={profileData.firstName} isEditing={isEditing} onChange={handleInputChange} placeholder="Не указано" />
            <EditableField label="Фамилия" name="lastName" value={profileData.lastName} isEditing={isEditing} onChange={handleInputChange} placeholder="Не указана" />
            <EditableField label="Дата рождения" name="birthDate" value={profileData.birthDate} isEditing={isEditing} onChange={handleInputChange} placeholder="ДД.ММ.ГГГГ" />
            
            {/* Custom Gender Field */}
            <div className="py-4 border-b border-gray-200/50 dark:border-gray-700/50 last:border-b-0">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Пол</p>
                {isEditing ? (
                    <select
                        name="gender"
                        value={profileData.gender}
                        onChange={handleInputChange}
                        className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md text-lg h-[42px]"
                    >
                        <option value="">Не выбрано</option>
                        <option value="male">Мужской</option>
                        <option value="female">Женский</option>
                        <option value="other">Другой</option>
                    </select>
                ) : (
                    <p className={`text-lg text-dark-primary dark:text-light-primary min-h-[42px] flex items-center ${!savedProfileData.gender && 'text-gray-500 italic'}`}>
                        {genderMap[savedProfileData.gender] || 'Не указан'}
                    </p>
                )}
            </div>

            <EditableField label="Город" name="city" value={profileData.city} isEditing={isEditing} onChange={handleInputChange} placeholder="Не указан" />
            <EditableField label="Страна" name="country" value={profileData.country} isEditing={isEditing} onChange={handleInputChange} placeholder="Не указана" />
          </div>

          <EditableField label="Биография" name="bio" value={profileData.bio} isEditing={isEditing} onChange={handleInputChange} placeholder="Расскажите о себе..." isTextarea />
        </div>
    </div>
  );
};

export default ProfilePage;