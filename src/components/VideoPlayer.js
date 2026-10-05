import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  FaCog, FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
  FaExpand, FaCompress, FaClosedCaptioning, FaSpinner
} from 'react-icons/fa';
import { MdReplay10, MdForward10, MdPictureInPicture } from 'react-icons/md';
import { qualityRank } from '../utils/quality';
import './VideoPlayer.css';

import Hls from 'hls.js';

function isHlsUrl(url = '') {
  return url.includes('.m3u8') || url.includes('hls') || url.includes('application/x-mpegURL');
}

function isDashUrl(url = '') {
  return url.includes('.mpd') || url.includes('dash');
}

function isEmbedUrl(url = '') {
  return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('embed');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Consecutive URL renewals allowed without playback progressing in between.
const MAX_REFRESH_ATTEMPTS = 3;
// Renew this long before the stated expiry — capped at a quarter of the URL's
// lifetime, so a short-lived URL isn't treated as expired the moment it arrives.
const EXPIRY_MARGIN_MS = 5000;
// Media seconds that must play on a renewed URL before renewal counts as working.
const PROGRESS_TO_RESET_S = 2;

/** Whether `time` (s) falls inside what the browser has already downloaded. */
const isBuffered = (video, time) => {
  const ranges = video.buffered;
  for (let i = 0; i < ranges.length; i++) {
    if (time >= ranges.start(i) && time < ranges.end(i) - 0.5) return true;
  }
  return false;
};

const formatTime = (seconds) => {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
};

/**
 * Professional production-ready VideoPlayer.
 *
 * Props:
 *   src           {string}   – single video URL (mp4/m3u8/mpd)
 *   sources       {object}   – { quality: url } map (e.g. { '1080p': '...' })
 *   initialQuality{string}   – default quality key
 *   title         {string}   – shown in top bar
 *   poster        {string}   – poster image URL
 *   onEnded       {function} – called when video finishes (for autoplay chaining)
 *   onProgress    {function} – called with { currentTime, duration, percent }
 *   // DRM/Widevine-ready architecture:
 *   drmConfig     {object}   – { servers: { 'com.widevine.alpha': '...' }, ... }
 */
const VideoPlayer = ({
  src,
  sources = {},
  // 720p buffers far less than 1080p on ordinary connections.
  initialQuality = '720p',
  // Start playing as soon as the video is ready (the viewer already chose to watch).
  autoPlay = false,
  title = '',
  poster = '',
  onEnded,
  onProgress,
  drmConfig = null,
  onRequestRefresh,
  // Bump when the parent has fetched fresh (re-signed) URLs, so the player
  // reloads even if a URL string happens to come back unchanged.
  sourceVersion = 0,
  // When the current signed URLs expire (ms since epoch), if known.
  sourcesExpireAt = null,
  emptyTitle = 'No video source available for this title yet.',
  emptySubtitle = 'The filmmaker may not have uploaded a video file yet.',
}) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const progressSaveRef = useRef(null);

  const [quality, setQuality] = useState(initialQuality);
  // The parent's pick changes once the plan is known (e.g. capped to 480p).
  useEffect(() => { setQuality(initialQuality); }, [initialQuality]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [error, setError] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const hideControlsTimer = useRef(null);

  // ─── Signed-URL renewal ───────────────────────────────────────────────────
  // Video URLs are short-lived. Once one expires, the next range request (after
  // a long pause, or a seek past the buffer) fails with 403, which the browser
  // reports as a media error. Instead of dead-ending, ask the parent for fresh
  // URLs and resume from the same position.
  const onRequestRefreshRef = useRef(onRequestRefresh);
  onRequestRefreshRef.current = onRequestRefresh;
  const expiresAtRef = useRef(sourcesExpireAt);
  expiresAtRef.current = sourcesExpireAt;
  const resumeRef = useRef(null);        // { time, play } to restore once fresh URLs load
  const refreshAttemptsRef = useRef(0);  // consecutive renewals without playback progressing
  const renewedAtTimeRef = useRef(null); // media time of the last renewal
  const sourceArrivedAtRef = useRef(Date.now()); // wall-clock time the current URLs arrived
  const wasPlayingRef = useRef(false);
  const lastTimeRef = useRef(0);
  const autoStartedRef = useRef(false);

  const requestFreshSource = useCallback((resume) => {
    const refresh = onRequestRefreshRef.current;
    if (!refresh || refreshAttemptsRef.current >= MAX_REFRESH_ATTEMPTS) return false;
    refreshAttemptsRef.current += 1;
    renewedAtTimeRef.current = resume.time;
    resumeRef.current = resume;
    setError('');
    setIsLoading(true);
    refresh();
    return true;
  }, []);

  // ─── Resolve active source URL ────────────────────────────────────────────
  // Highest first; unknown labels keep their order at the end.
  const availableQualities = Object.keys(sources).length > 0
    ? Object.keys(sources).sort((a, b) => qualityRank(b) - qualityRank(a))
    : (src ? ['default'] : []);
  const activeSrc = (() => {
    if (Object.keys(sources).length > 0) {
      // `src` is the parent's pick for this viewer (their quality, or the best
      // one below it) — a better fallback than whichever key happens to be first.
      return sources[quality] || sources[initialQuality] || src || Object.values(sources)[0] || '';
    }
    return src || '';
  })();
  const hasVideoElement = Boolean(activeSrc) && !isEmbedUrl(activeSrc);
  // The quality actually playing: the menu must not highlight a choice the
  // viewer's plan or the title's files can't deliver.
  const playingQuality = Object.keys(sources).find((q) => sources[q] === activeSrc) || quality;

  // ─── HLS / native source setup ────────────────────────────────────────────
  const attachSource = useCallback((url) => {
    const video = videoRef.current;
    if (!video || !url) return;

    setError('');
    setIsLoading(true);

    // Destroy previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHlsUrl(url)) {
      if (Hls && Hls.isSupported()) {
        const hls = new Hls({
          // DRM-ready: maxBufferLength, xhrSetup can be extended for token auth
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          enableWorker: true,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
        });
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.error('[VideoPlayer] HLS fatal error:', data.type, data.details);
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              const status = data.response?.code || data.response?.status;
              if (
                status === 401 ||
                status === 403 ||
                data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
                data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR
              ) {
                console.warn('[VideoPlayer] Signed URL may be expired. Requesting refresh...', { status, details: data.details });
                if (requestFreshSource({ time: video.currentTime || lastTimeRef.current, play: !video.paused || wasPlayingRef.current })) {
                  return; // Stop here, wait for parent to pass new sources
                }
              }
              // Attempt standard network recovery for other issues
              console.warn('[VideoPlayer] Network error, attempting to start load again...');
              hls.startLoad();
            } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              console.warn('[VideoPlayer] Media error, attempting recovery...');
              hls.recoverMediaError();
            } else {
              setError('Stream error. Please try again.');
              setIsLoading(false);
            }
          }
        });
        hlsRef.current = hls;
        return;
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        video.src = url;
        return;
      }
      setError('HLS streaming is not supported in this browser.');
      return;
    }

    if (isDashUrl(url)) {
      // DASH/Widevine hook — requires shaka-player or dash.js (future integration)
      // For now, attempt native playback and note DRM config presence
      if (drmConfig) {
        console.info('[VideoPlayer] DRM config present — Widevine/DASH integration ready:', drmConfig);
      }
      video.src = url;
      return;
    }

    // Standard MP4 / WebM
    video.src = url;
  }, [drmConfig, requestFreshSource]);

  // ─── Attach source when activeSrc changes (or fresh URLs arrive) ──────────
  useEffect(() => {
    if (isEmbedUrl(activeSrc)) {
      setIsLoading(false);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // After a URL renewal, resume exactly where the viewer was; otherwise (a
    // quality switch) keep the current position and play state.
    const resume = resumeRef.current;
    resumeRef.current = null;
    const autoStart = autoPlay && !autoStartedRef.current;
    const wasPlaying = resume ? resume.play : (!video.paused || autoStart);
    const savedTime = resume ? resume.time : (video.currentTime || 0);

    sourceArrivedAtRef.current = Date.now();
    attachSource(activeSrc);

    if (!activeSrc) {
      setIsLoading(false);
      return;
    }

    const onMetadata = () => {
      if (savedTime > 0) {
        try { video.currentTime = savedTime; } catch { /* not seekable yet */ }
      }
      if (wasPlaying) {
        autoStartedRef.current = true;
        // Browsers may refuse sound-on autoplay; start muted rather than not at all.
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', onMetadata, { once: true });
    return () => {
      video.removeEventListener('loadedmetadata', onMetadata);
    };
  }, [activeSrc, sourceVersion, attachSource, autoPlay]);

  // ─── Video event listeners ────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // True once the current URLs are (about to be) expired and `time` isn't
    // already downloaded — i.e. the browser would have to request it and fail.
    const needsFreshUrl = (time) => {
      const exp = expiresAtRef.current;
      if (!exp) return false;
      const lifetime = Math.max(0, exp - sourceArrivedAtRef.current);
      const margin = Math.min(EXPIRY_MARGIN_MS, lifetime / 4);
      return Date.now() >= exp - margin && !isBuffered(video, time);
    };

    const onTimeUpdate = () => {
      lastTimeRef.current = video.currentTime;
      // Playback has genuinely moved on since the last renewal: it worked.
      if (renewedAtTimeRef.current !== null &&
          Math.abs(video.currentTime - renewedAtTimeRef.current) >= PROGRESS_TO_RESET_S) {
        refreshAttemptsRef.current = 0;
        renewedAtTimeRef.current = null;
      }
      setCurrentTime(video.currentTime);
      if (onProgress && video.duration) {
        onProgress({
          currentTime: video.currentTime,
          duration: video.duration,
          percent: (video.currentTime / video.duration) * 100,
        });
      }
    };
    const onLoaded = () => { setDuration(video.duration); setIsLoading(false); };
    const onPlay = () => {
      wasPlayingRef.current = true;
      setIsPlaying(true);
      // Resuming after a long pause: renew first instead of letting it fail.
      if (needsFreshUrl(video.currentTime + 1)) {
        requestFreshSource({ time: video.currentTime, play: true });
      }
    };
    const onPause = () => { wasPlayingRef.current = false; setIsPlaying(false); };
    const onSeeking = () => {
      // Seeking past the buffer on an expired URL: renew before the request fails.
      if (needsFreshUrl(video.currentTime)) {
        requestFreshSource({ time: video.currentTime, play: wasPlayingRef.current });
      }
    };
    const onVolume = () => { setVolume(video.volume); setIsMuted(video.muted); };
    // Show the spinner only for a real stall: the browser fires `waiting` for
    // every brief gap, and flashing the overlay each time reads as constant buffering.
    let waitTimer = null;
    const onWaiting = () => { clearTimeout(waitTimer); waitTimer = setTimeout(() => setIsLoading(true), 500); };
    const onCanPlay = () => { clearTimeout(waitTimer); setIsLoading(false); };
    const onPlaying = () => { clearTimeout(waitTimer); setIsLoading(false); };
    const onEnded_ = () => {
      setIsPlaying(false);
      if (onEnded) onEnded();
    };
    const onError_ = () => {
      const code = video.error?.code;
      // An expired signed URL surfaces as a network (2) or source (4) error:
      // renew it and continue from the same spot rather than dead-ending.
      if ((code === 2 || code === 4) && requestFreshSource({
        time: video.currentTime || lastTimeRef.current,
        play: !video.paused || wasPlayingRef.current,
      })) {
        return;
      }
      if (code === 4) setError('Format not supported. The video file may be missing or incompatible.');
      else if (code === 2) setError('Network error. Check your connection and try again.');
      else setError('Unable to play this video. Please try again.');
      setIsLoading(false);
    };

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('seeking', onSeeking);
    video.addEventListener('volumechange', onVolume);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('ended', onEnded_);
    video.addEventListener('error', onError_);

    return () => {
      clearTimeout(waitTimer);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('seeking', onSeeking);
      video.removeEventListener('volumechange', onVolume);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded_);
      video.removeEventListener('error', onError_);
    };
    // `hasVideoElement`: the <video> only exists once there is a source, so the
    // listeners must (re)attach when it appears, not just on first mount.
  }, [onEnded, onProgress, requestFreshSource, hasVideoElement]);

  // ─── Fullscreen listener ──────────────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ─── Auto-hide controls ───────────────────────────────────────────────────
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideControlsTimer.current);
    hideControlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  }, [isPlaying]);

  useEffect(() => {
    const progressSave = progressSaveRef.current;
    const video = videoRef.current;

    return () => {
      clearTimeout(hideControlsTimer.current);
      clearInterval(progressSave);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.src = '';
        video.removeAttribute('src');
        video.load();
      }
    };
  }, []);

  // ─── Controls ─────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const handleVolumeChange = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    v.muted = val === 0;
  };

  const handleSeek = (e) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = parseFloat(e.target.value);
  };

  const seekBackward = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, v.currentTime - 10);
  };

  const seekForward = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await v.requestPictureInPicture();
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const toggleCaptions = () => {
    const v = videoRef.current;
    if (!v) return;
    for (let i = 0; i < v.textTracks.length; i++) {
      v.textTracks[i].mode = v.textTracks[i].mode === 'showing' ? 'hidden' : 'showing';
    }
  };

  // ─── No source state ──────────────────────────────────────────────────────
  if (!activeSrc) {
    return (
      <div className="video-player">
        <div className="video-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 360, background: '#111', borderRadius: 12 }}>
          <div style={{ textAlign: 'center', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎬</div>
            <p style={{ margin: 0 }}>{emptyTitle}</p>
            <p style={{ fontSize: 13, color: '#555', marginTop: 6 }}>{emptySubtitle}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`video-player${isFullscreen ? ' fullscreen' : ''}`}
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      <div className="video-wrapper">
        {/* Prevent downloading / exposing raw URL via right-click */}
        {isEmbedUrl(activeSrc) ? (
          <iframe
            src={activeSrc}
            title={title}
            className="video"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{ width: '100%', height: '100%', border: 'none', minHeight: '360px' }}
          />
        ) : (
          <video
            ref={videoRef}
            className="video"
            playsInline
            preload="auto"
            poster={poster}
            onContextMenu={(e) => e.preventDefault()}
            controlsList="nodownload"
            disablePictureInPicture={false}
          />
        )}

        {/* Loading spinner */}
        {isLoading && !error && (
          <div className="player-loading-overlay">
            <FaSpinner className="player-spinner-icon" size={48} color="#fff" />
          </div>
        )}

        {/* Top bar */}
        <div className={`player-topbar${showControls ? ' visible' : ''}`}>
          <div className="title">{title}</div>
        </div>

        {/* Controls overlay */}
        <div className={`player-controls-overlay${showControls ? ' visible' : ''}`}>
          {/* Progress */}
          <div className="progress-bar-container">
            <input
              type="range"
              className="progress-bar"
              min={0}
              max={duration || 0}
              step={0.1}
              value={currentTime}
              onChange={handleSeek}
              style={{ '--progress': duration ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>

          {/* Control bar */}
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
                    style={{ '--volume-progress': `${(isMuted ? 0 : volume) * 100}%` }}
                  />
                </div>
              </div>
              <span className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="control-right">
              <button className="control-btn seek-btn" onClick={seekBackward} aria-label="Rewind 10s">
                <MdReplay10 className="seek-icon" />
              </button>
              <button className="control-btn seek-btn" onClick={seekForward} aria-label="Forward 10s">
                <MdForward10 className="seek-icon" />
              </button>
              <button className="control-btn" onClick={toggleCaptions} aria-label="Captions">
                <FaClosedCaptioning />
              </button>

              {/* Quality selector */}
              {availableQualities.length > 1 && (
                <div style={{ position: 'relative' }}>
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
                              className={`quality-option${playingQuality === q ? ' active' : ''}`}
                              aria-pressed={playingQuality === q}
                              onClick={() => { setQuality(q); setIsSettingsOpen(false); }}
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button className="control-btn" onClick={togglePiP} aria-label="Picture-in-Picture">
                <MdPictureInPicture />
              </button>
              <button className="control-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
                {isFullscreen ? <FaCompress /> : <FaExpand />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="player-error">
          <span>⚠️ {error}</span>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
