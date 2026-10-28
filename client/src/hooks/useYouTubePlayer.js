import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../socket";
import { VIDEO_ID_REGEX } from "../utils/youtube";
import { canControlRole } from "../utils/roles";

export default function useYouTubePlayer({
  roomId,
  roleRef,
  canControl,
  setError,
}) {
  const [videoId, setVideoId] = useState("")
  const [playerReady, setPlayerReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0)
  const [seekValue, setSeekValue] = useState(0)
  const [muted, setMuted] = useState(false)
  const playerContainerRef = useRef(null)
  const playerRef = useRef(null);
  const playerReadyRef = useRef(false)
  const videoIdRef = useRef("");
  const remoteUpdateRef = useRef(false);
  const lastTimeRef = useRef(0)
  const pendingPlaybackRef = useRef(null);

  useEffect(() => {
    videoIdRef.current = videoId;
  }, [videoId]);

  // Apply a play/pause/seek that came from the server.
  const handleRemotePlayback = useCallback(
    ({ action, currentTime: time } = {}) => {
      const player = playerRef.current;

      if (!player ||!playerReadyRef.current ||typeof time !== "number" ||!Number.isFinite(time) ||time < 0) {
        return;
      }

        remoteUpdateRef.current = true;
      lastTimeRef.current = time;

      try {
          player.seekTo(time, true);

        if (action === "play") {
            player.playVideo();
        } else if (action === "pause") {
           player.pauseVideo();
        }
      } catch (err) {
        console.error("Unable to synchronize playback:", err);
      }

      window.setTimeout(() => {
          remoteUpdateRef.current = false;
      }, 800)
    },
    []
  )

  // Load a video that came from the server (or from the join response).
  const handleRemoteVideoChanged = useCallback(
    ({ videoId: newId, playback } = {}) => {
      if (!newId || !VIDEO_ID_REGEX.test(newId)) {
           console.error("Invalid video ID received", newId);
        return;
      }

      videoIdRef.current = newId;
        setVideoId(newId);
      setError("");
        setPlaying(false);
       setCurrentTime(0);
      setSeekValue(0);

      // Used for late joiners apply the current position after loading
      pendingPlaybackRef.current = playback || null;

     const player = playerRef.current;

      if (player && playerReadyRef.current) {
        try {
          // Browsers allow muted autoplay so viewers start muted
          if (!canControlRole(roleRef.current)) {
              player.mute()
            setMuted(true)
          }

          player.loadVideoById(newId)

          if (pendingPlaybackRef.current) {
               const pending = pendingPlaybackRef.current;
          pendingPlaybackRef.current = null;
            window.setTimeout(() => handleRemotePlayback(pending), 1500)
          }
        } catch (err) {
          console.error("Unable to load video:", err);
        }
      }
      // If the player is not ready ye onReady loads videoIdRef.current
    },
      [handleRemotePlayback, roleRef, setError]
  );

  // Called when this user gains control, so they don't stay muted.
  const releaseMute = useCallback(() => {
    if (!playerRef.current || !playerReadyRef.current) return;

    try {
      playerRef.current.unMute();
    } catch {
      // Ignore if the player is not readyy
    }

    setMuted(false);
  },  []);

  // Initialize the YouTube IFrame Player API
  useEffect(() => {
    let active = true;
      let createdPlayer = null;
    const container = playerContainerRef.current;

    function initializePlayer() {
      if (!active || !window.YT?.Player || !container || createdPlayer) return;

      // Fresh mount element every time, because destroy() removes it from the DOM.
      container.innerHTML = "";
      const mount = document.createElement("div");
    mount.style.width = "100%";
       mount.style.height = "100%";
       container.appendChild(mount);

      createdPlayer = new window.YT.Player(mount, { width: "100%", height: "100%", playerVars: {controls: 0,disablekb: 1,fs: 0, playsinline: 1,origin: window.location.origin,
          iv_load_policy: 3,
        },

        events: {
          onReady(event) {
            if (!active) return;

            playerRef.current = event.target;
        playerReadyRef.current = true;
            setPlayerReady(true);

            const id = videoIdRef.current;

            if (id && VIDEO_ID_REGEX.test(id)) {
              if (!canControlRole(roleRef.current)) {
                event.target.mute();
                setMuted(true);
              }

              event.target.loadVideoById(id);

              if (pendingPlaybackRef.current) {
            const pending = pendingPlaybackRef.current;
                  pendingPlaybackRef.current = null;
                window.setTimeout(() => handleRemotePlayback(pending), 1500);
              }
            }
          },

          onError(event) {
            console.error("YouTube player error:", event.data);

            const messages = {
              2: "Invalid YouTube video ID Check the video URL.",
            5: "this video cannot be played in the embedded player",
                100: "this video is unavailable or has been removed",
              101: "the video owner does not allow embedding",
              150: "The video owner does not allow embedding",
               153: "youTube could not verify the request client identity or referrer",
            }

            setError(
              messages[event.data] || `YouTube player error: ${event.data}`
            )
          },

          onStateChange(event) {
            if (!active) return;

            const player = event.target;
        const state = event.data;
            const yt = window.YT?.PlayerState;

            if (!yt) return;

            setPlaying(state === yt.PLAYING);

            try {
              const time = player.getCurrentTime();
              if (Number.isFinite(time)) {
                 setCurrentTime(time);
                setSeekValue(time);
              }
            } catch {
              // Player may not be ready for time queries yet
            }

            // Only host and moderators publish playback changes
            if (!canControlRole(roleRef.current) || remoteUpdateRef.current) {
              return;
            }

            let action = null;
            if (state === yt.PLAYING) action = "play";
              if (state === yt.PAUSED) action = "pause";

            if (action) {
              const time = player.getCurrentTime();

              socket.emit("playback-sync", {
                roomId,
                 action,
                currentTime: time,
              });

              lastTimeRef.current = time;
            }
          },
        },
      })
    }

    if (window.YT?.Player) {
         initializePlayer();
    } else {
      const previousCallback = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = () => {
    previousCallback?.();
        initializePlayer();
      };

      const scriptExists = document.querySelector(
            'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!scriptExists) {
        const script = document.createElement("script");
     script.src = "https://www.youtube.com/iframe_api";
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => {
      active = false;
        playerReadyRef.current = false;
      setPlayerReady(false);

      if (createdPlayer) {
        try {
          createdPlayer.destroy();
        } catch {
          // Ignore errors if the iframe is already gon
        }
      }

      if (container) container.innerHTML = "";
      playerRef.current = null;
    };
  }, [roomId, handleRemotePlayback, roleRef, setError]);

  //eep the seek bar updated and detect seeking by host or moderators
  useEffect(() => {
    if (!playerReady) return;

    const intervalId = window.setInterval(() => {
      const player = playerRef.current;
      if (!player) return;

      try {
        const time = player.getCurrentTime();
    const total = player.getDuration();
        const state = player.getPlayerState();

        if (Number.isFinite(time)) {
          setCurrentTime(time);
           if (!canControl) setSeekValue(time);
        }

        if (Number.isFinite(total) && total > 0) {
          setDuration(total);
        }

        if (
          canControl &&
            state === window.YT.PlayerState.PLAYING &&
          !remoteUpdateRef.current &&
            Math.abs(time - lastTimeRef.current) > 2.5
        ) {
          socket.emit("playback-sync", {
            roomId,
           action: "seek",
            currentTime: time,
          });
        }

        lastTimeRef.current = time;
      } catch {
        // ignore temporary player readiness errors
      }
    }, 500);

    return () => window.clearInterval(intervalId);
  }, [playerReady, canControl, roomId]);

  function togglePlayback() {
    if (!canControl || !playerReadyRef.current || !playerRef.current) return;

    if (playing) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }

  function commitSeek() {
    if (!canControl || !playerReadyRef.current || !playerRef.current) return;

    const time = Number(seekValue);
    if (!Number.isFinite(time) || time < 0) return;

    remoteUpdateRef.current = true;
      playerRef.current.seekTo(time, true);
    lastTimeRef.current = time;

    socket.emit("playback-sync", {
    roomId,
      action: "seek",
      currentTime: time,
    });

    window.setTimeout(() => {
      remoteUpdateRef.current = false;
    }, 500);
  }

  function unmute() {
    if (!playerRef.current || !playerReadyRef.current) return;

    playerRef.current.unMute();
      playerRef.current.setVolume(100);
    setMuted(false);
  }

  return {playerContainerRef,videoId,playerReady,playing,currentTime,duration,seekValue,setSeekValue,
    muted,handleRemoteVideoChanged,handleRemotePlayback,releaseMute,togglePlayback,commitSeek,unmute, };
}