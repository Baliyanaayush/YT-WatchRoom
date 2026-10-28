import { useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

const NAME_KEY = "watchroom-name";

 function Home() {
  const navigate = useNavigate();

  const [name, setName] = useState(() => {
    try {
      return localStorage.getItem(NAME_KEY) || ""
    } catch {
      return ""
    }
  });
  const [roomCode, setRoomCode] = useState("")
  const [error, setError] = useState("")
  const [creating, setCreating] = useState(false)

  // Returns the cleaned up name or null if it missing.
  function getName() {
    const trimmed = name.trim()
    if (!trimmed) {setError("Enter your name first so the others know who you are.");return null }

    try {
      localStorage.setItem(NAME_KEY, trimmed)
    } catch {
      // Storage can be blocked the name just cannot be remembered.
    }

    return trimmed;
  }

  function handleCreateRoom() {
    const username = getName()
    if (!username) return;
    setError("")
    setCreating(true)



    socket.connect()


    socket.timeout(5000).emit("create-room", { username }, (err, response) => {
      setCreating(false);
      if (err) {
        setError("Can't reach the server. Check that it's running and try again.")
        return;
      }

      if (!response?.success) {
        setError("Couldn't create the room. Try again.")
        return;
      }

      navigate(`/room/${response.roomId}`, {
        state: { username, role: response.role },
      })
    })
  }

  function handleJoinRoom(e) {
    e.preventDefault()

    const username = getName()
    if (!username) return

    const code = roomCode.trim().toUpperCase()

    if (!code) {
      setError("Enter the room code your friend sent you.");
      return
    }
    setError("")

    navigate(`/room/${code}`, {
      state: { username, role: "participant" },
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="mx-auto max-w-5xl px-6 py-5">
        <span className="text-xl font-bold text-violet-400">watchRoom</span>
      </header>

      <main className="mx-auto grid max-w-5xl gap-12 px-6 pb-16 pt-10 md:grid-cols-2 md:items-center md:pt-20">
  <div>
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
            Watch YouTube with friends, in sync.
          </h1>
             <p className="mt-4 max-w-md text-zinc-400">
            Start a room, send the link, and paste a video. When the host
            presses play, everyone's player plays too.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300">
            Your name
          </label>
          <input
            id="name"
               value={name}
            onChange={(e) => setName(e.target.value)}
               maxLength={20}
            placeholder="What should we call you?"
          className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 outline-none placeholder:text-zinc-600 focus:border-violet-500"
          />

          <button
             type="button"
            onClick={handleCreateRoom}
          disabled={creating}
            className="mt-4 w-full rounded-lg bg-violet-500 px-4 py-3 font-semibold hover:bg-violet-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {creating ? "Creating room..." : "Create a room"}
          </button>

          <div className="my-6 flex items-center gap-3 text-sm text-zinc-500">
               <div className="h-px flex-1 bg-white/10" />
                  <span>or join a friend's room</span>
                        <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleJoinRoom} className="flex gap-2">
            <input
              value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
               maxLength={8}
             placeholder="Room code"
                aria-label="Room code"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 font-mono uppercase tracking-widest outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-600 focus:border-violet-500"
            />
            <button
              type="submit"
               className="rounded-lg border border-white/15 px-5 py-3 font-semibold hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
            >
              Join
            </button>
          </form>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-400">
              {error}
            </p>
          )}
        </div>
      </main>
    </div>
  )
}

export default Home