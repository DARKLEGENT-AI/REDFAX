
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/apiService';
import type { UserFile } from '../types';

// --- Icon Components ---
const MusicNoteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-full w-full" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>;
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 5.14A1.5 1.5 0 004 6.5v7a1.5 1.5 0 002.3 1.36l6-3.5a1.5 1.5 0 000-2.72l-6-3.5z" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 4.5a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5zm6.5 0a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5z" /></svg>;
const NextIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 010-1.06L10.18 10 7.21 7.03a.75.75 0 011.06-1.06l3.5 3.5a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 01-1.06 0z" clipRule="evenodd" /></svg>;
const PrevIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 010 1.06L9.82 10l2.97 2.97a.75.75 0 11-1.06 1.06l-3.5-3.5a.75.75 0 010-1.06l3.5-3.5a.75.75 0 011.06 0z" clipRule="evenodd" /></svg>;
const VolumeHighIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>;
const VolumeMuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l-4-4m0 4l4-4" /></svg>;

interface MusicPlayerProps {
    activeFile: UserFile;
    playlist: UserFile[];
    token: string;
    onTrackChange: (fileId: string) => void;
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ activeFile, playlist, token, onTrackChange }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [currentTrackUrl, setCurrentTrackUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const activeTrackUrlRef = useRef<string | null>(null);

    useEffect(() => {
        const loadTrack = async () => {
            setIsLoading(true);
            setError(null);
            setIsPlaying(false);
            if (audioRef.current) audioRef.current.pause();
            setProgress(0);
            setDuration(0);

            try {
                const blob = await api.getFileBlob(token, activeFile.id);
                if (activeTrackUrlRef.current) {
                    URL.revokeObjectURL(activeTrackUrlRef.current);
                }
                const objectUrl = URL.createObjectURL(blob);
                activeTrackUrlRef.current = objectUrl;
                setCurrentTrackUrl(objectUrl);
            } catch (err) {
                console.error("Error loading track:", err);
                setError("Не удалось загрузить трек.");
            } finally {
                setIsLoading(false);
            }
        };

        loadTrack();
    }, [activeFile, token]);

    useEffect(() => {
        if (currentTrackUrl && audioRef.current) {
            audioRef.current.src = currentTrackUrl;
            audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
                console.error("Playback was interrupted:", e);
                setIsPlaying(false);
            });
        }
    }, [currentTrackUrl]);

    useEffect(() => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.play().catch(e => {
                console.error("Error playing audio:", e);
                setIsPlaying(false);
            });
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        return () => {
            if (activeTrackUrlRef.current) {
                URL.revokeObjectURL(activeTrackUrlRef.current);
            }
        };
    }, []);

    const playNext = useCallback(() => {
        if (playlist.length === 0) return;
        const currentIndex = playlist.findIndex(track => track.id === activeFile.id);
        if (currentIndex === -1) return;
        const nextIndex = (currentIndex + 1) % playlist.length;
        const nextTrack = playlist[nextIndex];
        if (nextTrack) {
            onTrackChange(nextTrack.id);
        }
    }, [activeFile.id, playlist, onTrackChange]);

    const playPrev = useCallback(() => {
        if (playlist.length === 0) return;
        const currentIndex = playlist.findIndex(track => track.id === activeFile.id);
        if (currentIndex === -1) return;
        const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
        const prevTrack = playlist[prevIndex];
        if (prevTrack) {
            onTrackChange(prevTrack.id);
        }
    }, [activeFile.id, playlist, onTrackChange]);

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setProgress(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
        }
    };
    
    const handleSongEnd = () => playNext();
    const togglePlayPause = () => setIsPlaying(!isPlaying);

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (audioRef.current) {
            const newTime = Number(e.target.value);
            audioRef.current.currentTime = newTime;
            setProgress(newTime);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
        }
    };

    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return "00:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    return (
        <div className="flex-1 flex flex-col items-center justify-center h-full p-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-dark-primary dark:to-black">
             <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleTimeUpdate} onEnded={handleSongEnd} />
            <div className="w-full max-w-sm flex flex-col items-center">
                {/* Album Art */}
                <div className="w-64 h-64 bg-light-secondary dark:bg-dark-secondary shadow-2xl rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-600 mb-8 relative">
                    {isLoading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                             <div className="w-8 h-8 border-4 border-gray-300 border-t-soviet-red rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="w-32 h-32">
                           <MusicNoteIcon />
                        </div>
                    )}
                </div>

                {/* Track Info */}
                <h2 className="text-2xl font-bold text-center truncate w-full" title={activeFile.name.replace(/\.mp3/i, '')}>
                    {activeFile.name.replace(/\.mp3/i, '')}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">RED FAX Music</p>
                {error && <p className="text-soviet-red text-sm mt-2">{error}</p>}

                {/* Progress Bar */}
                <div className="w-full mt-6">
                    <input
                        type="range"
                        min="0"
                        max={duration}
                        value={progress}
                        onChange={handleProgressChange}
                        disabled={isLoading || !!error}
                        className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs font-mono text-gray-500 mt-1">
                        <span>{formatTime(progress)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>
                </div>
                
                {/* Controls */}
                <div className="flex items-center gap-6 mt-4">
                    <button onClick={playPrev} className="text-gray-600 dark:text-gray-400 hover:text-dark-primary dark:hover:text-white transition-colors disabled:opacity-50" disabled={playlist.length <= 1}>
                        <PrevIcon />
                    </button>
                    <button onClick={togglePlayPause} className="w-16 h-16 flex items-center justify-center bg-soviet-red text-white rounded-full shadow-lg hover:scale-105 transition-transform disabled:bg-gray-500" disabled={isLoading || !!error}>
                        {isPlaying ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <button onClick={playNext} className="text-gray-600 dark:text-gray-400 hover:text-dark-primary dark:hover:text-white transition-colors disabled:opacity-50" disabled={playlist.length <= 1}>
                        <NextIcon />
                    </button>
                </div>

                {/* Volume */}
                <div className="flex items-center gap-3 w-40 mt-8">
                    <VolumeMuteIcon />
                     <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="w-full h-2 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <VolumeHighIcon />
                </div>
            </div>
        </div>
    );
};

export default MusicPlayer;
