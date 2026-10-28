function RoomHeader({ roomId, copied, onCopy, onHome }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
         <button onClick={onHome} className="text-2xl font-bold text-violet-400">
        watchRoom
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-white/10 px-3 py-2 text-sm">
             Room: {roomId}
   </span>

        <button
          onClick={onCopy}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-semibold hover:bg-violet-600"
        >
          {copied ? "Copied!" : "Copy Invite Link"}
    </button>
      </div>
    </header>
  );
}

export default RoomHeader;