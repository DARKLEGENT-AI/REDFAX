
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/apiService';
import type { UserFile } from '../types';

// --- Icon Components ---
const PlayIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 5.14A1.5 1.5 0 004 6.5v7a1.5 1.5 0 002.3 1.36l6-3.5a1.5 1.5 0 000-2.72l-6-3.5z" /></svg>;
const PauseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20"><path d="M5.75 4.5a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5zm6.5 0a.75.75 0 00-.75.75v9.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V5.25a.75.75 0 00-.75-.75h-1.5z" /></svg>;
const VolumeHighIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>;
const VolumeMuteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l-4-4m0 4l4-4" /></svg>;
const FullscreenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4h4m6 0h4v4m0 6v4h-4m-6 0H4v-4" /></svg>;
const ExitFullscreenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 4H4v4m12 0V4h-4m0 12h4v-4M8 20H4v-4" /></svg>;


interface VideoPlayerProps {
    activeFile: UserFile;
    token: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ activeFile, token }) => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [areControlsVisible, setAreControlsVisible] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const videoUrlRef = useRef<string | null>(null);
    const controlsTimeoutRef = useRef<number | null>(null);

    const showControls = useCallback(() => {
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        setAreControlsVisible(true);
        controlsTimeoutRef.current = window.setTimeout(() => {
            if (videoRef.current && !videoRef.current.paused) {
                setAreControlsVisible(false);
            }
        }, 3000);
    }, []);

    useEffect(() => {
        const loadVideo = async () => {
            setIsLoading(true);
            setError(null);
            setIsPlaying(false);
            setProgress(0);
            setDuration(0);

            try {
                const blob = await api.getFileBlob(token, activeFile.id);
                if (videoUrlRef.current) {
                    URL.revokeObjectURL(videoUrlRef.current);
                }
                const objectUrl = URL.createObjectURL(blob);
                videoUrlRef.current = objectUrl;
                setVideoUrl(objectUrl);
            } catch (err) {
                console.error("Error loading video:", err);
                setError("Не удалось загрузить видео.");
            } finally {
                setIsLoading(false);
            }
        };

        loadVideo();
        showControls();
        
        return () => {
             if (videoUrlRef.current) {
                URL.revokeObjectURL(videoUrlRef.current);
                videoUrlRef.current = null;
            }
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, [activeFile, token, showControls]);

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        if (isPlaying) {
            videoElement.play().catch(e => {
                console.error("Playback was interrupted:", e);
                setIsPlaying(false);
            });
        } else {
            videoElement.pause();
        }
    }, [isPlaying]);
    
    useEffect(() => {
        const videoElement = videoRef.current;
        if (videoElement) {
            videoElement.volume = volume;
            videoElement.muted = isMuted;
        }
    }, [volume, isMuted]);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setProgress(videoRef.current.currentTime);
        }
    };
    
    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
        }
    };

    const handlePlayPause = () => {
        setIsPlaying(!isPlaying);
        showControls();
    };

    const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (videoRef.current) {
            const newTime = Number(e.target.value);
            videoRef.current.currentTime = newTime;
            setProgress(newTime);
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = Number(e.target.value);
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
    };
    
    const toggleMute = () => {
        setIsMuted(!isMuted);
    };

    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    
    const toggleFullscreen = () => {
        if (!playerContainerRef.current) return;
        if (!document.fullscreenElement) {
            playerContainerRef.current.requestFullscreen().catch(err => {
                alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    
    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const formatTime = (timeInSeconds: number) => {
        if (isNaN(timeInSeconds) || timeInSeconds === Infinity) return "00:00";
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    const handleVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
        if (e.target === videoRef.current) {
            handlePlayPause();
        }
    };

    return (
        <div 
            ref={playerContainerRef}
            onMouseMove={showControls}
            onMouseLeave={() => { if(isPlaying && controlsTimeoutRef.current) { clearTimeout(controlsTimeoutRef.current); controlsTimeoutRef.current = null; setAreControlsVisible(false); } }}
            className="relative w-full h-full bg-black flex items-center justify-center text-white"
        >
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                    <div className="w-12 h-12 border-4 border-gray-400 border-t-soviet-red rounded-full animate-spin"></div>
                </div>
            )}
            {error && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20 p-4">
                    <h3 className="text-xl text-soviet-red font-bold">Ошибка</h3>
                    <p className="text-gray-300 mt-2 text-center">{error}</p>
                </div>
            )}
            
            <video
                ref={videoRef}
                src={videoUrl ?? ''}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={handleVideoClick}
                className={`max-w-full max-h-full ${!areControlsVisible && isPlaying ? 'cursor-none' : 'cursor-pointer'}`}
            />

            <div 
                className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 z-10 ${areControlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
                onMouseEnter={showControls}
            >
                {/* Progress Bar */}
                <input
                    type="range"
                    min="0"
                    max={duration || 1}
                    value={progress}
                    onChange={handleProgressChange}
                    disabled={isLoading || !!error}
                    className="w-full h-1.5 bg-gray-500/50 rounded-lg appearance-none cursor-pointer"
                />
                
                {/* Controls */}
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-4">
                        <button onClick={handlePlayPause} disabled={isLoading || !!error} className="text-white hover:text-soviet-red transition-colors">
                            {isPlaying ? <PauseIcon /> : <PlayIcon />}
                        </button>
                        <div className="flex items-center gap-2">
                            <button onClick={toggleMute} className="text-white hover:text-soviet-red transition-colors">
                                {isMuted || volume === 0 ? <VolumeMuteIcon /> : <VolumeHighIcon />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                value={isMuted ? 0 : volume}
                                onChange={handleVolumeChange}
                                className="w-24 h-1.5 bg-gray-500/50 rounded-lg appearance-none cursor-pointer"
                           />
                        </div>
                         <div className="text-xs font-mono">
                            <span>{formatTime(progress)}</span> / <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button onClick={toggleFullscreen} className="text-white hover:text-soviet-red transition-colors">
                            {isFullscreen ? <ExitFullscreenIcon /> : <FullscreenIcon />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoPlayer;
