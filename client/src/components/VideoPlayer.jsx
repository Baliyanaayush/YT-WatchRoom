function VideoPlayer({ containerRef, videoId, canControl, muted, onUnmute }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
      <div className="relative aspect-video">
        {/* react does not manage this div children the player mounts inside it */}
        <div ref={containerRef} className="h-full w-full" />

        {/* block interaction with the YouTube iframe for people without control */}
        {!canControl && videoId && (
          <div
            className="absolute inset-0 z-10 cursor-not-allowed"
             aria-label="Only the host and moderators can control playback"
            title="Only the host and moderators can control playback"
          />
        )}

        {!canControl && videoId && muted && (
          <button
             type="button"
               onClick={onUnmute}
          className="absolute bottom-3 right-3 z-20 rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold hover:bg-violet-600"
          >
             Click to unmute
          </button>
        )}

        {!videoId && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black px-4 text-center">
            <div className="mb-4 text-5xl">▶</div>
            <h2 className="text-xl font-semibold">
              Your watch party starts here
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {canControl? "Load a YouTube video to get started.": "Waiting for the host to load a video."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoPlayer