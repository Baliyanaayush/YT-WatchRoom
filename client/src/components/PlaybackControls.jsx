import { formatTime } from "../utils/youtube";

function PlaybackControls({isHost,playing,playerReady,currentTime,duration,seekValue,onToggle,onSeekChange,onSeekCommit}) 
{
  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
        onClick={onToggle}
            disabled={!playerReady}
          className="rounded-lg bg-violet-500 px-4 py-2 font-semibold hover:bg-violet-600 disabled:opacity-40"
        >
           {playing ? "Pause" : "Play"}
        </button>

        <span className="min-w-[42px] text-sm text-zinc-300">
          {formatTime(currentTime)}
        </span>

        <input
          type="range"
          min="0"
            max={duration || 0}
              step="1"
             value={Math.min(seekValue, duration || 0)}
                disabled={!playerReady || duration <= 0}
          onChange={(event) => onSeekChange(Number(event.target.value))}
            onMouseUp={onSeekCommit}
          onTouchEnd={onSeekCommit}
           onKeyUp={(event) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
              onSeekCommit();
            }
          }}
             className="min-w-0 flex-1 accent-violet-500 disabled:opacity-40"
          aria-label="Seek video"
        />

        <span className="min-w-[42px] text-right text-sm text-zinc-300">
        {formatTime(duration)}
        </span>
      </div>

      <p className="mt-2 text-xs text-zinc-500">
          {isHost ? "Host" : "Moderator"} controls · Playback changes sync with
      everyone
      </p>
    </div>
  );
}

export default PlaybackControls;