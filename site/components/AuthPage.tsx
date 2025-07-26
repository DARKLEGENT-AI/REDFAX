
import React, { useState, FormEvent } from 'react';
import { useTheme } from '../hooks/useTheme';

const StarIcon = () => (
  <svg className="w-24 h-24 text-soviet-red" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" />
    </svg>
);

const SunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 12a5 5 0 100-10 5 5 0 000 10z" />
    </svg>
);

const MoonIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
);


interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister }) => {
  const { theme, toggleTheme } = useTheme();
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      if (!username || !password) {
        throw new Error("Имя пользователя и пароль не могут быть пустыми.");
      }
      if (isLoginView) {
        await onLogin(username, password);
      } else {
        await onRegister(username, password);
      }
    } catch (err: any) {
      setError(err.message || 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewToggle = (isLogin: boolean) => {
    setIsLoginView(isLogin);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-light-primary dark:bg-dark-primary p-4 text-dark-primary dark:text-light-primary relative">
      <div className="absolute top-4 right-4">
        <button 
          onClick={toggleTheme} 
          className="text-gray-500 dark:text-gray-400 hover:text-soviet-red transition-colors p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" 
          aria-label="Toggle theme"
        >
            {theme === 'light' ? <MoonIcon /> : <SunIcon />}
        </button>
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative group">
            <StarIcon />
            <div className="absolute inset-0 flex justify-center items-center pointer-events-none" aria-hidden="true">
              {/* Равенство (Equality) - Top */}
              <span className="absolute opacity-0 -translate-y-8 group-hover:-translate-y-16 group-hover:opacity-100 transition-all duration-300 ease-out text-dark-primary dark:text-light-primary uppercase tracking-wider font-bold text-lg whitespace-nowrap">
                Равенство
              </span>
              {/* Свобода (Freedom) - Left */}
              <span className="absolute opacity-0 translate-x-0 group-hover:-translate-x-28 group-hover:opacity-100 transition-all duration-300 ease-out text-dark-primary dark:text-light-primary uppercase tracking-wider font-bold text-lg whitespace-nowrap">
                Свобода
              </span>
              {/* Братство (Fraternity) - Right */}
              <span className="absolute opacity-0 translate-x-0 group-hover:translate-x-28 group-hover:opacity-100 transition-all duration-300 ease-out text-dark-primary dark:text-light-primary uppercase tracking-wider font-bold text-lg whitespace-nowrap">
                Братство
              </span>
            </div>
          </div>
        </div>
        <h1 className="text-4xl font-bold text-center uppercase tracking-wider">
          RED FAX
        </h1>
        <div className="bg-light-secondary dark:bg-dark-secondary p-8 mt-6 shadow-lg dark:shadow-none rounded-lg">
          <div className="flex border-b border-gray-200 dark:border-gray-600 mb-6">
            <button
              onClick={() => handleViewToggle(true)}
              className={`flex-1 py-2 text-lg uppercase tracking-widest transition-colors ${isLoginView ? 'text-soviet-red border-b-2 border-soviet-red' : 'text-gray-500 dark:text-gray-400 hover:text-dark-primary dark:hover:text-light-primary'}`}
            >
              Вход
            </button>
            <button
              onClick={() => handleViewToggle(false)}
              className={`flex-1 py-2 text-lg uppercase tracking-widest transition-colors ${!isLoginView ? 'text-soviet-red border-b-2 border-soviet-red' : 'text-gray-500 dark:text-gray-400 hover:text-dark-primary dark:hover:text-light-primary'}`}
            >
              Регистрация
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="username">
                Имя пользователя
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 dark:text-gray-300 text-sm font-bold mb-2 uppercase" htmlFor="password">
                Пароль
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 pr-10 outline-none rounded-md"
                  required
                />
                <button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400 hover:text-soviet-red dark:hover:text-soviet-red focus:outline-none focus:text-soviet-red transition-colors"
                  aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {error && <p className="text-soviet-red text-xs italic mb-4">{error}</p>}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-soviet-red hover:bg-red-700 text-white font-bold py-2 px-4 uppercase tracking-wider disabled:bg-gray-500 rounded-md"
            >
              {isLoading ? 'Загрузка...' : isLoginView ? 'Войти' : 'Создать'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;