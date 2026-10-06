// The top of a game's profile: cover, name, type, stats and the main actions.
import { Clock, FolderOpen, HardDrive, Layers, Play, Square, Download, Timer, Globe } from "lucide-react";
import type { Game } from "../api";
import { GameCover, LoaderGlyph } from "./art";
import { loaderLabel, javaFor } from "../lib/versions";
import { ago, playtime } from "./time";

export default function GameHero({ game, running, busy, mods, worlds, onPlay, onFolder }: {
  game: Game; running: boolean; busy: boolean; mods: number; worlds: number;
  onPlay: () => void; onFolder: () => void;
}) {
  const stats: [typeof Clock, string, string][] = [
    [Timer, "Played", playtime(game.playtime)],
    [Clock, "Last played", ago(game.lastPlayed)],
    [Layers, "Mods", game.loader ? String(mods) : "—"],
    [Globe, "Worlds", String(worlds)],
    [HardDrive, "Memory", `${(game.memory / 1024).toFixed(game.memory % 1024 ? 1 : 0)} GB`],
  ];
  return (
    <section className="v17-gamehero">
      <div className="v17-gamehero-cover">
        <GameCover seed={game.id} loader={game.loader} showVersion={false} />
        <div className="v17-gamehero-shade" />
        <div className="v17-gamehero-title">
          <span className="v17-gamehero-type"><LoaderGlyph loader={game.loader} size={13} /> {game.loader ? loaderLabel(game.loader) : "Vanilla"}{javaFor(game.version) ? ` · Java ${javaFor(game.version)}` : ""}</span>
          <strong>{game.name}</strong>
          <span className="v17-gamehero-version mono">{game.version}</span>
        </div>
      </div>
      <div className="v17-gamehero-bar">
        <button type="button" className={`v17-btn v17-btn-lg ${running ? "v17-btn-stop" : "v17-btn-primary"}`} disabled={busy && !running} onClick={onPlay}>
          {running ? <><Square size={16} fill="currentColor" /> Stop</> : game.installed ? <><Play size={17} fill="currentColor" /> Play</> : <><Download size={17} /> Install</>}
        </button>
        <button type="button" className="v17-btn v17-btn-ghost v17-btn-lg" onClick={onFolder}><FolderOpen size={17} /> Folder</button>
      </div>
      <dl className="v17-gamehero-stats">
        {stats.map(([Icon, label, value]) => (
          <div key={label}><dt><Icon size={13} /> {label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      {!!game.tags?.length && <div className="v17-card-tags v17-gamehero-tags">{game.tags.map((t) => <span key={t}>{t}</span>)}</div>}
      {game.notes && <p className="v17-gamehero-notes">{game.notes}</p>}
    </section>
  );
}
