
import React, { useState } from 'react';
import ChatPage from './ChatPage';
import NewsPage from './NewsPage';
import PollsPage from './PollsPage';
import FilesPage from './FilesPage';
import CalendarPage from './CalendarPage';
import ProfilePage from './ProfilePage';
import WeatherWidget from './WeatherWidget';
import { useTheme } from '../hooks/useTheme';

interface MainLayoutProps {
  user: { username: string };
  token: string;
  onLogout: () => void;
}

type Tab = 'messenger' | 'news' | 'polls' | 'files' | 'calendar' | 'profile';

const LogoutIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
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

const MainLayout: React.FC<MainLayoutProps> = ({ user, token, onLogout }) => {
  const [activeTab, setActiveTab] = useState<Tab>('messenger');
  const { theme, toggleTheme } = useTheme();

  const tabs: { id: Tab, name: string }[] = [
    { id: 'messenger', name: 'Мессенджер' },
    { id: 'news', name: 'Новости' },
    { id: 'polls', name: 'Голосования' },
    { id: 'files', name: 'Файлы' },
    { id: 'calendar', name: 'КАЛЕНДАРЬ' },
    { id: 'profile', name: 'Профиль' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'messenger':
        return <ChatPage user={user} token={token} onLogout={onLogout} />;
      case 'news':
        return <NewsPage />;
      case 'polls':
        return <PollsPage />;
      case 'files':
        return <FilesPage user={user} token={token} />;
      case 'calendar':
        return <CalendarPage user={user} token={token} />;
      case 'profile':
        return <ProfilePage user={user} token={token} />;
      default:
        return <ChatPage user={user} token={token} onLogout={onLogout} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary">
      <header className="flex-shrink-0 bg-light-secondary dark:bg-dark-secondary border-b border-gray-200 dark:border-gray-700 shadow-md">
        <div className="container mx-auto px-4">
            <div className="flex items-center justify-between min-h-16 py-2">
                <div className="flex items-center space-x-4 min-w-0">
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <svg className="w-8 h-8 text-soviet-red" fill="currentColor" viewBox="0 0 20 20">
                         <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/>
                      </svg>
                      <h1 className="text-xl font-bold uppercase tracking-wider">RED FAX</h1>
                    </div>
                    <nav className="flex items-center flex-wrap gap-2">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-3 py-2 rounded-md text-sm font-medium uppercase tracking-wider transition-colors duration-200 whitespace-nowrap ${
                                    activeTab === tab.id
                                    ? 'bg-soviet-red text-white'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-dark-primary dark:hover:text-white'
                                }`}
                            >
                            {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
                <div className="flex items-center space-x-4 flex-shrink-0">
                    <WeatherWidget />
                    <span className="text-gray-700 dark:text-gray-300 font-medium">{user.username}</span>
                     <button onClick={toggleTheme} className="text-gray-500 dark:text-gray-400 hover:text-soviet-red transition-colors" aria-label="Toggle theme">
                        {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                    </button>
                    <button onClick={onLogout} className="text-gray-500 dark:text-gray-400 hover:text-soviet-red transition-colors" aria-label="Выйти">
                        <LogoutIcon />
                    </button>
                </div>
            </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default MainLayout;
