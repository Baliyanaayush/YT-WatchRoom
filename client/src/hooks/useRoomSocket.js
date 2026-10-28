import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import { canControlRole } from "../utils/roles";

export default function useRoomSocket({roomId,username,roleRef,setRole,onVideoChanged,onPlayback,onGainControl,}) 
{
  const navigate = useNavigate();




  const [participants, setParticipants] = useState([])
  const [connected, setConnected] = useState(socket.connected)
  const [roomError, setRoomError] = useState("")
  const [notice, setNotice] = useState("")

  // Hide the role notice after a few seconds
  useEffect(() => {
    if (!notice) return

    const timeoutId = window.setTimeout(() => setNotice(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [notice])

  // Connect to the room and register socket listeners once per room.
  useEffect(() => {
    let active = true
     let joined = false
    function handleConnect() {
      if (active) {
    setConnected(true)
        setRoomError("")
      }
    }

    function handleDisconnect() {
      if (active) setConnected(false)
    }

    function joinRoom() {
      if (!active || joined) return
      joined = true

      socket.emit("join-room", { roomId, username }, (response) => {
        if (!active) return

        if (!response?.success) {
          setRoomError(response?.message || "Unable to join this room.");
          setParticipants([])
          return
        }

        const newRole = response.role || "participant";
      setRole(newRole);
        roleRef.current = newRole;
         setParticipants(response.participants || []);
        setRoomError("");

        // Late joiners: load the video that is already playing.
        if (response.videoId) {
          onVideoChanged({
          videoId: response.videoId,
            playback: response.playback,
          });
        }
      });
    }

    function handleRoomUsers(users) {
      if (!active) return;

      const list = Array.isArray(users) ? users : []
        setParticipants(list);

      const me = list.find((u) => u.id === socket.id)

      if (me && me.role !== roleRef.current) {
      setRole(me.role)
        roleRef.current = me.role

        // Someone who just gained control no longer needs the viewer mute.
        if (canControlRole(me.role)) onGainControl()
      }
    }

    function handleRoleAssigned({ userId, role: assignedRole } = {}) {
      if (!active || userId !== socket.id) return
      setNotice(
        assignedRole === "moderator"? "The host made you a moderator. You can now control playback.": "The host changed your role to participant."  );
    }

    function handleKicked({ message } = {}) {
      if (!active) return;
    alert(message || "You were removed from the room.");
      navigate("/");
    }

    socket.on("connect", handleConnect)
     socket.on("disconnect", handleDisconnect)
    socket.on("room-users", handleRoomUsers)
   socket.on("role-assigned", handleRoleAssigned)
    socket.on("kicked", handleKicked);
         socket.on("video-changed", onVideoChanged)
    socket.on("playback-updated", onPlayback)

    if (socket.connected) {
          setConnected(true)
            joinRoom()
    } else {
       socket.connect()
          socket.on("connect", joinRoom)
    }
    return () => {
      active = false;

      socket.off("connect", handleConnect)
          socket.off("connect", joinRoom)
              socket.off("disconnect", handleDisconnect)
      socket.off("room-users", handleRoomUsers)
       socket.off("role-assigned", handleRoleAssigned)
      socket.off("kicked", handleKicked)
    socket.off("video-changed", onVideoChanged)
      socket.off("playback-updated", onPlayback)
    }
  }, [roomId,username,navigate,roleRef,setRole,onVideoChanged,onPlayback,onGainControl,])

  return { participants, connected, roomError, notice }
}