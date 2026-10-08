import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMusicLink, safeThumb, youTubeIds, addLink, CAPABILITIES } from "../src/v19/links.ts";

test("YouTube and YouTube Music links become tidy, de-duplicable keys", () => {
  const v = parseMusicLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s");
  assert.deepEqual([v.provider, v.kind, v.key, v.url], ["youtube", "video", "yt:video:dQw4w9WgXcQ", "https://www.youtube.com/watch?v=dQw4w9WgXcQ"]);
  assert.equal(parseMusicLink("youtu.be/dQw4w9WgXcQ").key, "yt:video:dQw4w9WgXcQ");
  assert.equal(parseMusicLink("https://m.youtube.com/shorts/dQw4w9WgXcQ").key, "yt:video:dQw4w9WgXcQ");
  const l = parseMusicLink("https://music.youtube.com/playlist?list=PLQwRmTwWx0ubcpv0SkHroupj1LqW5_Va5&si=abc");
  assert.deepEqual([l.provider, l.kind, l.key], ["ytmusic", "playlist", "yt:list:PLQwRmTwWx0ubcpv0SkHroupj1LqW5_Va5"]);
  // A personal mix can't be embedded as a list; the video is kept.
  assert.equal(parseMusicLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDdQw4w9WgXcQ").key, "yt:video:dQw4w9WgXcQ");
  assert.deepEqual(youTubeIds("https://music.youtube.com/watch?v=dQw4w9WgXcQ"), { video: "dQw4w9WgXcQ" });
  assert.equal(youTubeIds("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"), null);
});

test("Spotify links: kinds, intl paths, short links", () => {
  const t = parseMusicLink("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=xyz");
  assert.deepEqual([t.provider, t.kind, t.url], ["spotify", "track", "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"]);
  assert.equal(parseMusicLink("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M").kind, "playlist");
  assert.equal(parseMusicLink("https://open.spotify.com/track/short"), null);
  assert.deepEqual(parseMusicLink("https://spotify.link/AbCdEf123"), { provider: "spotify", short: true, url: "https://spotify.link/AbCdEf123" });
});

test("Apple Music links: albums, songs inside albums, playlists, a readable hint", () => {
  const a = parseMusicLink("https://music.apple.com/us/album/random-access-memories/617154241");
  assert.deepEqual([a.provider, a.kind, a.key, a.hint], ["apple", "album", "am:album:617154241", "Random Access Memories"]);
  const s = parseMusicLink("https://music.apple.com/gb/album/get-lucky/617154241?i=617154366");
  assert.deepEqual([s.kind, s.key], ["song", "am:song:617154366"]);
  assert.equal(parseMusicLink("https://music.apple.com/us/playlist/chill/pl.u-abcd1234efgh").kind, "playlist");
});

test("hosts are matched exactly, and unsafe links are refused", () => {
  for (const bad of [
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "https://evilyoutube.com/watch?v=dQw4w9WgXcQ",
    "https://open.spotify.com.example/track/4uLU6hMCjMI75M1A2tKUQC",
    "https://user:pw@open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
    "https://www.youtube.com:8443/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "ftp://music.apple.com/us/album/x/1",
    "https://www.youtube.com/watch?v=short",
    "",
  ]) assert.equal(parseMusicLink(bad), null, bad);
  assert.equal(parseMusicLink("http://youtu.be/dQw4w9WgXcQ").url.startsWith("https://"), true);
});

test("artwork is only shown from the services' image hosts", () => {
  assert.equal(safeThumb("https://i.ytimg.com/vi/x/hqdefault.jpg"), "https://i.ytimg.com/vi/x/hqdefault.jpg");
  assert.equal(safeThumb("https://i.scdn.co/image/ab67"), "https://i.scdn.co/image/ab67");
  assert.equal(safeThumb("https://i.ytimg.com.evil.example/a.jpg"), undefined);
  assert.equal(safeThumb("http://i.ytimg.com/a.jpg"), undefined);
  assert.equal(safeThumb(42), undefined);
});

test("saving the same item twice keeps one entry, newest first, with fresher details", () => {
  const a = { ...parseMusicLink("https://youtu.be/dQw4w9WgXcQ"), added: 1 };
  const b = { ...parseMusicLink("https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"), added: 2 };
  let list = addLink(addLink([], a), b);
  list = addLink(list, { ...parseMusicLink("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1"), title: "Song", added: 3 });
  assert.equal(list.length, 2);
  assert.equal(list[0].key, "yt:video:dQw4w9WgXcQ");
  assert.equal(list[0].title, "Song");
});

test("only sources LOAM plays itself claim a real spectrum", () => {
  for (const [id, c] of Object.entries(CAPABILITIES)) assert.equal(c.spectrum, id === "files", id);
  for (const id of ["spotify", "apple"]) assert.equal(CAPABILITIES[id].plays, "external");
});

test("SoundCloud tracks, sets and profiles; site pages are not music", () => {
  const t = parseMusicLink("https://soundcloud.com/forss/flickermood?si=abc");
  assert.deepEqual([t.provider, t.kind, t.key, t.url, t.hint], ["soundcloud", "track", "sc:track:forss/flickermood", "https://soundcloud.com/forss/flickermood", "Flickermood"]);
  assert.equal(parseMusicLink("https://m.soundcloud.com/forss/sets/soulhack").kind, "playlist");
  assert.equal(parseMusicLink("https://soundcloud.com/forss").kind, "profile");
  assert.deepEqual(parseMusicLink("https://on.soundcloud.com/AbCd123"), { provider: "soundcloud", short: true, url: "https://on.soundcloud.com/AbCd123" });
  assert.equal(parseMusicLink("https://soundcloud.com/discover"), null);
  assert.equal(parseMusicLink("https://soundcloud.com/forss/likes"), null);
  assert.equal(parseMusicLink("https://soundcloud.com.evil.example/forss/flickermood"), null);
  assert.equal(safeThumb("https://i1.sndcdn.com/artworks-x.jpg"), "https://i1.sndcdn.com/artworks-x.jpg");
  assert.equal(CAPABILITIES.soundcloud.plays, "external");
});
