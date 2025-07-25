
import React, { useState, FormEvent } from 'react';

const StarIcon = () => (
  <svg className="w-24 h-24 text-soviet-red" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
  </svg>
);


interface AuthPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onRegister }) => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-light-primary dark:bg-dark-primary p-4 text-dark-primary dark:text-light-primary">
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
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-2 outline-none rounded-md"
                required
              />
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
