import React, { useState, useRef, useEffect, useCallback } from 'react';

// Icons
const PlayIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M6.5 5.5l8 4.5-8 4.5v-9z" />
    </svg>
);

const PauseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
        <path d="M5.75 4.5a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5zm6.5 0a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5z" />
    </svg>
);

interface VoiceMessagePlayerProps {
  audioUrl: string;
}

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ audioUrl }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isDarkTheme, setIsDarkTheme] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);

    // Check for theme once on mount
    useEffect(() => {
        setIsDarkTheme(document.documentElement.classList.contains('dark'));
    }, []);

    const updateProgress = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (isFinite(audio.duration)) {
             setDuration(audio.duration);
        }
        setProgress(audio.currentTime);
    }, []);
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        
        const handleEnded = () => setIsPlaying(false);
        
        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', updateProgress);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', updateProgress);
            audio.removeEventListener('ended', handleEnded);
        };
    }, [updateProgress]);

    useEffect(() => {
        if (isPlaying) {
            audioRef.current?.play().catch(console.error);
        } else {
            audioRef.current?.pause();
        }
    }, [isPlaying]);
    
    useEffect(() => {
        const progressBar = progressRef.current;
        if (!progressBar) return;
        const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;
        
        const trackColor = isDarkTheme ? '#4b5563' : '#d1d5db'; // Corresponds to Tailwind's gray-600 and gray-300
        progressBar.style.background = `linear-gradient(to right, #CC0000 ${progressPercentage}%, ${trackColor} ${progressPercentage}%)`;

    }, [progress, duration, isDarkTheme]);

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsPlaying(prev => !prev);
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            audioRef.current.currentTime = Number(e.target.value);
            setProgress(Number(e.target.value));
        }
    };
    
    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds) || !isFinite(timeInSeconds)) return "00:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    return (
        <div className="flex items-center gap-3 w-full max-w-[250px] sm:max-w-[300px] py-1">
            <audio ref={audioRef} src={audioUrl} preload="metadata"></audio>
            <button
                onClick={togglePlayPause}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-soviet-red text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>
            <div className="flex-grow flex flex-col justify-center w-full">
                 <input
                    ref={progressRef}
                    type="range"
                    min="0"
                    max={duration || 1}
                    value={progress}
                    onChange={handleProgressChange}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full h-0.5 appearance-none cursor-pointer rounded-lg"
                    aria-label="Audio progress"
                />
                <div className="flex justify-between mt-1.5">
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {formatTime(progress)}
                    </span>
                    <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default VoiceMessagePlayer;