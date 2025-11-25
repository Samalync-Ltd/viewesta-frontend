import React, { useEffect, useMemo, useRef, useState } from 'react';
import { 
  FaCog, 
  FaPlay, 
  FaPause, 
  FaVolumeUp, 
  FaVolumeMute, 
  FaExpand,
  FaClosedCaptioning,
  FaCompress
} from 'react-icons/fa';
import { 
  MdReplay10, 
  MdForward10,
  MdPictureInPicture
} from 'react-icons/md';
import './VideoPlayer.css';

const fallbackSourcesByQuality = {
  '480p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  '720p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  '1080p': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  '4K': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4'
};

function getSourceForQuality(movie, quality) {
  if (movie && movie.sources && movie.sources[quality]) return movie.sources[quality];
  return fallbackSourcesByQuality[quality] || fallbackSourcesByQuality['1080p'];
}

const VideoPlayer = ({ movie, initialQuality = '1080p' }) => {
  const videoRef = useRef(null);
  const [quality, setQuality] = useState(initialQuality);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const src = useMemo(() => getSourceForQuality(movie, quality), [movie, quality]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
    };
  }, []);

  useEffect(() => {
    // On quality change, keep current time and continue playback
    const video = videoRef.current;
    if (!video) return;
    const wasPaused = video.paused;
    const current = video.currentTime;
    const playAfterLoad = !wasPaused;
    const onLoaded = () => {
      video.currentTime = current;
      if (playAfterLoad) {
        video.play().catch(() => {});
      }
      video.removeEventListener('loadedmetadata', onLoaded);
    };
    video.addEventListener('loadedmetadata', onLoaded);
  }, [src]);

  const handleError = () => setError('Unable to play this video. Try another quality.');

  const formatTime = (seconds) => {
    if (!isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs}`;
    }
    return `${mins}:${secs}`;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const handleVolumeChange = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
  };

  const toggleFullscreen = () => {
    const el = videoRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const seekBackward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, video.currentTime - 10);
  };

  const seekForward = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  };

  const togglePictureInPicture = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (error) {
      console.error('Picture-in-Picture error:', error);
    }
  };

  const toggleCaptions = () => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    if (tracks && tracks.length > 0) {
      for (let i = 0; i < tracks.length; i++) {
        tracks[i].mode = tracks[i].mode === 'showing' ? 'hidden' : 'showing';
      }
    }
  };

  const availableQualities = ['480p', '720p', '1080p', '4K'];

  return (
    <div className="video-player">
      <div className="video-wrapper">
        <video
          ref={videoRef}
          className="video"
          src={src}
          playsInline
          onContextMenu={(e) => e.preventDefault()}
          onError={handleError}
          poster={movie?.backdrop || movie?.poster}
        />

        <div className="player-topbar">
          <div className="title">{movie?.title}</div>
        </div>

        <div className="player-controls-overlay">
          <div className="progress-bar-container">
            <input
              type="range"
              className="progress-bar"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              style={{
                '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%'
              }}
            />
          </div>

          <div className="control-bar">
            <div className="control-left">
              <button className="control-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>
                {isPlaying ? <FaPause /> : <FaPlay />}
              </button>
              <div className="volume-control">
                <button className="control-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
                  {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <div className="volume-slider-container">
                  <input
                    type="range"
                    className="volume-slider"
                    min={0}
                    max={1}
                    step={0.01}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    aria-label="Volume"
                    style={{
                      '--volume-progress': `${(isMuted ? 0 : volume) * 100}%`
                    }}
                  />
                </div>
              </div>
              <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="control-right">
              <button className="control-btn seek-btn" onClick={seekBackward} aria-label="Rewind 10 seconds">
                <MdReplay10 className="seek-icon" />
              </button>
              <button className="control-btn seek-btn" onClick={seekForward} aria-label="Forward 10 seconds">
                <MdForward10 className="seek-icon" />
              </button>
              <button className="control-btn" onClick={toggleCaptions} aria-label="Closed Captions">
                <FaClosedCaptioning />
              </button>
              <button
                className="control-btn"
                aria-label="Settings"
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              >
                <FaCog />
              </button>
              {isSettingsOpen && (
                <div className="settings-panel" onMouseLeave={() => setIsSettingsOpen(false)}>
                  <div className="settings-group">
                    <div className="settings-label">Quality</div>
                    <div className="quality-options">
                      {availableQualities.map((q) => (
                        <button
                          key={q}
                          className={`quality-option ${quality === q ? 'active' : ''}`}
                          onClick={() => setQuality(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <button className="control-btn" onClick={togglePictureInPicture} aria-label="Picture-in-Picture">
                <MdPictureInPicture />
              </button>
              <button className="control-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
                {document.fullscreenElement ? <FaCompress /> : <FaExpand />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="player-error">{error}</div>}
    </div>
  );
};

export default VideoPlayer;


