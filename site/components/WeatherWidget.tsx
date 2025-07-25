import React, { useState, useEffect, useCallback } from 'react';

// --- Icon Components ---
const WeatherSunIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M12 12a5 5 0 100-10 5 5 0 000 10z" />
    </svg>
);
const WeatherCloudIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
);
const WeatherPartlyCloudyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v1"/>
        <path d="M12 18v1"/>
        <path d="M4.22 4.22l.707.707"/>
        <path d="M18.36 18.36l.707.707"/>
        <path d="M2 12h1"/>
        <path d="M21 12h1"/>
        <path d="M18 12.5A4.5 4.5 0 0 0 13.5 8H13A5 5 0 0 0 8 3H8a5 5 0 0 0-5 5v.5A4.5 4.5 0 0 0 7.5 17H13"/>
    </svg>
);
const WeatherRainIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zm4-3v6m4-6v6m4-6v6" />
    </svg>
);
const WeatherSnowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15zm2-3l2 2m0-4l-2 2m6-2l2 2m0-4l-2 2m-2-2l2 2m-4 0l2-2" />
    </svg>
);
const WeatherThunderIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
);
const WeatherFogIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15a4 4 0 004 4h6a4 4 0 000-8H9a4 4 0 00-4 4zm0 0H3m18 0h-2" />
    </svg>
);

// --- Type Definitions ---
interface WeatherData {
  temperature: number;
  weathercode: number;
}
interface LocationData {
  name: string;
  latitude: number;
  longitude: number;
}

// --- Helper Functions ---
const getWeatherInfo = (code: number): { Icon: React.FC<any>; description: string } => {
  if (code === 0) return { Icon: WeatherSunIcon, description: 'Ясно' };
  if (code >= 1 && code <= 2) return { Icon: WeatherPartlyCloudyIcon, description: 'Переменная облачность' };
  if (code === 3) return { Icon: WeatherCloudIcon, description: 'Облачно' };
  if (code === 45 || code === 48) return { Icon: WeatherFogIcon, description: 'Туман' };
  if ((code >= 51 && code <= 57) || (code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { Icon: WeatherRainIcon, description: 'Дождь' };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return { Icon: WeatherSnowIcon, description: 'Снег' };
  }
  if (code >= 95 && code <= 99) return { Icon: WeatherThunderIcon, description: 'Гроза' };
  
  return { Icon: WeatherSunIcon, description: 'Неизвестно' }; // Default fallback
};


const WeatherWidget: React.FC = () => {
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [location, setLocation] = useState<LocationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [cityInput, setCityInput] = useState('');

    const fetchWeather = useCallback(async (lat: number, lon: number, name: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
            if (!response.ok) throw new Error('Не удалось получить данные о погоде.');
            
            const data = await response.json();
            const newLocation = { name, latitude: lat, longitude: lon };
            
            setWeather(data.current_weather);
            setLocation(newLocation);
            localStorage.setItem('weatherLocation', JSON.stringify(newLocation));
        } catch (e: any) {
            setError(e.message || 'Ошибка');
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleSearch = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cityInput.trim()) return;
        
        setIsLoading(true);
        setError(null);
        try {
            const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput)}&count=1&language=ru&format=json`);
            if (!geoResponse.ok) throw new Error('Ошибка поиска города.');
            
            const geoData = await geoResponse.json();
            if (!geoData.results || geoData.results.length === 0) {
                throw new Error('Город не найден.');
            }
            
            const { latitude, longitude, name } = geoData.results[0];
            await fetchWeather(latitude, longitude, name);
            setIsEditing(false);

        } catch (e: any) {
            setError(e.message || 'Ошибка');
            console.error(e);
            setIsLoading(false); // Stop loading on error
        }
    }, [cityInput, fetchWeather]);
    
    useEffect(() => {
        const savedLocation = localStorage.getItem('weatherLocation');
        if (savedLocation) {
            const { latitude, longitude, name } = JSON.parse(savedLocation);
            fetchWeather(latitude, longitude, name);
        } else {
            // Default location: Moscow
            fetchWeather(55.7522, 37.6156, "Москва");
        }
    }, [fetchWeather]);

    if (isLoading && !weather) {
        return <div className="text-sm text-gray-500 dark:text-gray-400 px-3">Загрузка погоды...</div>;
    }

    if (error && !weather) {
        return <div className="text-sm text-soviet-red px-3" title={error}>Ошибка погоды</div>;
    }
    
    if (!weather || !location) {
        return null;
    }

    if (isEditing) {
        return (
            <form onSubmit={handleSearch} className="flex items-center gap-1">
                <input
                    type="text"
                    value={cityInput}
                    onChange={(e) => setCityInput(e.target.value)}
                    className="w-28 bg-light-primary dark:bg-dark-primary text-dark-primary dark:text-light-primary border border-gray-300 dark:border-gray-600 focus:border-soviet-red focus:ring-1 focus:ring-soviet-red/50 p-1 text-sm outline-none rounded-md"
                    placeholder="Введите город..."
                    autoFocus
                />
                 <button type="submit" className="p-1 rounded-md bg-soviet-red hover:bg-red-700 text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                 </button>
                 <button type="button" onClick={() => setIsEditing(false)} className="p-1 rounded-md bg-gray-500 hover:bg-gray-600 text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </form>
        )
    }

    const { Icon, description } = getWeatherInfo(weather.weathercode);
    
    return (
        <div className="flex items-center">
            <button 
                onClick={() => { setIsEditing(true); setCityInput(location.name); }}
                className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 p-2 rounded-md transition-colors"
                title={description}
            >
                <Icon />
                <span className="font-medium text-sm">{Math.round(weather.temperature)}°C</span>
                <span className="text-sm opacity-80">{location.name}</span>
            </button>
        </div>
    );
};

export default WeatherWidget;
