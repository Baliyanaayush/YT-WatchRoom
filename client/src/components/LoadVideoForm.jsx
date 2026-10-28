import { useState } from "react";

function LoadVideoForm({ canControl, connected, roomError, onSubmit }) {
  const [url, setUrl] = useState("");

  function handleSubmit(event) {
        event.preventDefault();
            onSubmit(url.trim());
  }

  return (
    <form
          onSubmit={handleSubmit}
                className="mt-4 flex flex-col gap-3 sm:flex-row"
    >
      <input
         value={url}
             onChange={(event) => setUrl(event.target.value)}
                 placeholder="Paste a YouTube video URL..."
        disabled={!canControl}
           className="min-w-0 flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 outline-none focus:border-violet-500 disabled:opacity-50"
      />

      <button
           type="submit"
        disabled={!canControl || !connected || Boolean(roomError)}
              className="rounded-xl bg-violet-500 px-6 py-3 font-semibold hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Load Video
      </button>
    </form>
  );
}

export default LoadVideoForm;