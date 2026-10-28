// this only decides what the UI shows.
export function canControlRole(role) {
  return role === "host" || role === "moderator";
}