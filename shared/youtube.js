/** Accept only explicit HTTP(S) YouTube video URLs, never raw IDs. */
export function youtubeId(input) {
  if (typeof input !== "string") return null;
  try {
    const u = new URL(input.trim());
    if (!["https:", "http:"].includes(u.protocol) || u.username || u.password || u.port) return null;
    const hosts = ["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"];
    let id;
    if (u.hostname === "youtu.be") id = u.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    else if (hosts.includes(u.hostname)) {
      if (u.pathname === "/watch" && u.searchParams.getAll("v").length === 1) id = u.searchParams.get("v");
      else id = u.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? id : null;
  } catch { return null; }
}
