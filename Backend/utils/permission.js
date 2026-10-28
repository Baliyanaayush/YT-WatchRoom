const ROLES = {HOST: "host",MODERATOR: "moderator",PARTICIPANT: "participant",};

// Roles the host is allowed to hand out with assign-role.
// "host" is not in this list; hosting is moved with transfer-host
const ASSIGNABLE_ROLES = [ROLES.MODERATOR, ROLES.PARTICIPANT];

// host and moderators can control playback and change the video
function canControl(role) {
  return role === ROLES.HOST || role === ROLES.MODERATOR;
}

function getRole(room, socketId) {
  return room.participants.get(socketId)?.role || null;
}

module.exports = { ROLES, ASSIGNABLE_ROLES, canControl, getRole };