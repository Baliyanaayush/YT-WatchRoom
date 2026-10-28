function Participant({participants,selfId,isHost,roomError,onAssignRole,onMakeHost,onKick,}) 
{
  return (
    <aside className="h-fit rounded-2xl border border-white/10 bg-zinc-900/70 p-5">
      <h2 className="text-lg font-semibold">Participants</h2>

      <p className="mt-1 text-sm text-zinc-400">
        {participants.length} {participants.length === 1 ? "person" : "people"}{" "}
        in this room
      </p>

      <div className="mt-5 space-y-3">
        {participants.map((participant) => (
          <div
              key={participant.id}
            className="flex items-center gap-3 rounded-xl bg-white/5 p-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500 font-bold">
                     {(participant.username || "G").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                {participant.username || "Guest"}
                    {participant.id === selfId && (
            <span className="ml-1 text-xs text-zinc-500">(you)</span>
                )}
              </p>
              <p className="text-xs capitalize text-zinc-400">
                {participant.role || "participant"}
              </p>

              {isHost && participant.id !== selfId && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    value={participant.role}
                    onChange={(event) =>
                          onAssignRole(participant, event.target.value)
                    }
                    aria-label={`Role for ${participant.username}`}
                    className="rounded-md border border-white/10 bg-zinc-950 px-2 py-1 text-xs text-zinc-200 outline-none focus:border-violet-500"
                  >
                    <option value="participant">Participant</option>
                        <option value="moderator">Moderator</option>
                  </select>

                  <button
                    type="button"
                        onClick={() => onMakeHost(participant)}
                    className="rounded-md bg-violet-500/20 px-2 py-1 text-xs text-violet-300 hover:bg-violet-500/30"
                  >
                    Make host
                  </button>
                  <button
                       type="button"
                    onClick={() => onKick(participant)}
                        className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-300 hover:bg-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            {participant.role === "host" && (
                  <span className="text-xs text-violet-400">Host</span>
            )}      
            {participant.role === "moderator" && (
                     <span className="text-xs text-sky-400">Mod</span>
            )}
          </div>
        ))}

        {participants.length === 0 && !roomError && (
              <p className="py-4 text-sm text-zinc-500">Loading participants...</p>
        )}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <h3 className="font-medium">Room information</h3>
            <p className="mt-2 text-sm text-zinc-400">
                 Share the invite link with friends so they can join this room.
           </p>
      </div>
    </aside>
  );
}

export default Participant;