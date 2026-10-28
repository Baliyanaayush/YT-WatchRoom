import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import socket from "../socket";
import useYouTubePlayer from "../hooks/useYouTubePlayer";
import useRoomSocket from "../hooks/useRoomSocket"
import { canControlRole } from "../utils/roles"
import { getYouTubeVideoId } from "../utils/youtube";
import RoomHeader from "../components/RoomHeader"
import VideoPlayer from "../components/VideoPlayer"
import PlaybackControls from "../components/PlaybackControls"
import LoadVideoForm from "../components/LoadVideoForm"
import ParticipantList from "../components/Participants"

function WatchRoom() {
  const {roomId} = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const username = location.state?.username ||"Guest"

  const [role, setRole] = useState("participant")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  const roleRef = useRef("participant")
  const isHost = role === "host"
  const canControl = canControlRole(role)

  useEffect(() => {
     roleRef.current = role
     }, [role]);

  const player = useYouTubePlayer({ roomId,roleRef, canControl,setError })

  const { participants, connected, roomError, notice } = useRoomSocket({roomId,username,roleRef,setRole,onVideoChanged: player.handleRemoteVideoChanged,onPlayback: player.handleRemotePlayback,
    onGainControl: player.releaseMute,
  })

  function handleLoadVideo(url) {
       if (!canControl || !socket.connected || roomError) return

    const id = getYouTubeVideoId(url);

    if (!id) {
      setError(
        "Enter a valid YouTube URL, such as https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      )
      return;
    }
setError("")

    // The server broadcasts video-changed to everyone in the room, including
    // the sender, and the socket listener performs the load.
    socket.emit("video-change", { roomId, videoId: id })
  }

  function handleAssignRole(participant, newRole) {
    if (!isHost || newRole === participant.role) return

    socket.emit("assign-role", { roomId, targetId: participant.id, role: newRole },(response) => {if (!response?.success) {
          setError(response?.message || "Unable to change role.")
        }
      })}

  function handleKick(participant) {
    if (!isHost) return;

    if (!window.confirm(`Remove ${participant.username} from the room?`)) {
      return;
    }

    socket.emit(
      "kick-participant",{ roomId, targetId: participant.id },(response) => {
        if (!response?.success) {
          setError(response?.message || "Unable to remove participant.")
        }
      }
    )}

  function handleMakeHost(participant) {
    if (!isHost) return;
    if (
      !window.confirm(
        `Make ${participant.username} the host? You will lose host controls.`
      )
    ) {
      return
    }

    socket.emit("transfer-host",{ roomId, targetId: participant.id },(response) => {
        if (!response?.success) {
          setError(response?.message || "Unable to transfer host.")
        }
      }
    );
  }

  async function handleCopyLink() {
    setCopied(false)
    setError("")
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true);
    } catch {
      setError("Unable to copy the link. Copy it directly from your browser.")
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <RoomHeader
        roomId={roomId}
        copied={copied}
        onCopy={handleCopyLink}
        onHome={() => navigate("/")}
      />

      <main className="mx-auto grid max-w-7xl gap-6 p-6 lg:grid-cols-[1fr_300px]">
        <section className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
         <div>
              <h1 className="text-2xl font-bold">Watch Party</h1>
          <p className="mt-1 text-sm text-zinc-400">
                Watching as {username} · {role}
            </p>
          </div>

            <span
              className={`rounded-full px-3 py-1 text-sm ${connected ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}
            >
              {connected ? "Connected" : "Disconnected"}
            </span>
          </div>

          {roomError && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                      {roomError}
            </div>
          )}

          {notice && (
            <div className="mb-4 rounded-xl border border-violet-500/20 bg-violet-500/10 p-4 text-sm text-violet-200">
                    {notice}
            </div>
          )}

          <VideoPlayer
            containerRef={player.playerContainerRef}
                  videoId={player.videoId}
              canControl={canControl}
            muted={player.muted}
              onUnmute={player.unmute}
          />

          {canControl && player.videoId && (
            <PlaybackControls
               isHost={isHost}
              playing={player.playing}
              playerReady={player.playerReady}
                 currentTime={player.currentTime}
              duration={player.duration}
              seekValue={player.seekValue}
                     onToggle={player.togglePlayback}
              onSeekChange={player.setSeekValue}
            onSeekCommit={player.commitSeek}
            />
          )}

          <LoadVideoForm
                canControl={canControl}
            connected={connected}
         roomError={roomError}
            onSubmit={handleLoadVideo}
          />

          {error && (<p className="mt-3 break-words text-sm text-red-400">{error}</p>)}

          {!canControl && (<p className="mt-3 text-sm text-zinc-500">
              Only the host and moderators can load, play, pause, or seek the
              video.</p>)}
        </section>

        <ParticipantList
          participants={participants}
            selfId={socket.id}
           isHost={isHost}
          roomError={roomError}
            onAssignRole={handleAssignRole}
          onMakeHost={handleMakeHost}
          onKick={handleKick}
        />
      </main>
      </div>
  );
}




   
export default WatchRoom;