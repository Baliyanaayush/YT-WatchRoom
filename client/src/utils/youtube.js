export const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

export function getYouTubeVideoId(url) {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, "");

    let id = null;

    if (host === "youtu.be") {
      id = parsedUrl.pathname.split("/").filter(Boolean)[0];
    } else if (
      ["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com",].includes(host)
    ) {
      if (parsedUrl.pathname === "/watch") {
        id = parsedUrl.searchParams.get("v");
      } else {
        const match = parsedUrl.pathname.match(/^\/(embed|shorts|live)\/([^/]+)/);
        id = match?.[2] || null;
      }
    }

    return id && VIDEO_ID_REGEX.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${String(secs).padStart(2, "0")}`;
}