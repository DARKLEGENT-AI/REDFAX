
import React from 'react';
import { useAuth } from './hooks/useAuth';
import AuthPage from './components/AuthPage';
import MainLayout from './components/MainLayout';

const StarIcon = () => (
  <svg className="w-16 h-16 text-soviet-red" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
  </svg>
);


function App() {
  const { token, user, login, register, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary">
            <StarIcon />
            <p className="mt-4 text-xl tracking-wider uppercase">Загрузка...</p>
        </div>
    );
  }

  if (token && user) {
      return <MainLayout user={user} token={token} onLogout={logout} />;
  }

  return <AuthPage onLogin={login} onRegister={register} />;
}

export default App;
