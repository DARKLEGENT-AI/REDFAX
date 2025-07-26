
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/apiService';

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

const LoadingSpinner = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

interface VoiceMessagePlayerProps {
  audioUrl?: string;
  audioFileId?: string;
}

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({ audioUrl, audioFileId }) => {
    const { token } = useAuth();
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isDarkTheme, setIsDarkTheme] = useState(false);
    const [internalAudioUrl, setInternalAudioUrl] = useState(audioUrl);
    const [isFetching, setIsFetching] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    // Cleanup object URL on unmount
    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    // Reset state when props change
    useEffect(() => {
        setIsPlaying(false);
        setProgress(0);
        setDuration(0);
        setInternalAudioUrl(audioUrl); // Use the optimistic URL if provided
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
    }, [audioUrl, audioFileId]);


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
        if (isPlaying && internalAudioUrl) {
            audioRef.current?.play().catch(console.error);
        } else {
            audioRef.current?.pause();
        }
    }, [isPlaying, internalAudioUrl]);
    
    useEffect(() => {
        const progressBar = progressRef.current;
        if (!progressBar) return;
        const progressPercentage = duration > 0 ? (progress / duration) * 100 : 0;
        
        const trackColor = isDarkTheme ? '#4b5563' : '#d1d5db'; // Corresponds to Tailwind's gray-600 and gray-300
        progressBar.style.background = `linear-gradient(to right, #CC0000 ${progressPercentage}%, ${trackColor} ${progressPercentage}%)`;

    }, [progress, duration, isDarkTheme]);

    const togglePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (internalAudioUrl) {
            setIsPlaying(prev => !prev);
            return;
        }

        if (audioFileId && token && !isFetching) {
            setIsFetching(true);
            api.getVoiceMessageBlob(token, audioFileId)
                .then(blob => {
                    const newUrl = URL.createObjectURL(blob);
                    objectUrlRef.current = newUrl;
                    setInternalAudioUrl(newUrl);
                    setIsPlaying(true);
                })
                .catch(err => {
                    console.error("Failed to fetch audio blob:", err);
                })
                .finally(() => {
                    setIsFetching(false);
                });
        }
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current && internalAudioUrl) {
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
    <>
        <style>{`
        input[type="range"]::-webkit-slider-thumb {
            display: none;
        }
        input[type="range"]::-moz-range-thumb {
            display: none;
        }
        `}</style>

        <div className="flex items-center gap-3 w-full max-w-[250px] sm:max-w-[300px] py-1">
        <audio ref={audioRef} src={internalAudioUrl || ''} preload="metadata"></audio>
        <button
            onClick={togglePlayPause}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-soviet-red text-white hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:bg-gray-500"
            aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
            disabled={isFetching}
        >
            {isFetching ? <LoadingSpinner /> : isPlaying ? <PauseIcon /> : <PlayIcon />}
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
    </>
    );
};

export default VoiceMessagePlayer;
