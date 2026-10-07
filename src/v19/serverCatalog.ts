// Popular public servers LOAM lists for convenience, with what they're for. LOAM doesn't run,
// endorse or vouch for any of them.
//
// `offline`: whether the server let an offline (non-Microsoft) profile log in when LOAM checked on
// OFFLINE_CHECKED (a normal client handshake that disconnects at the login reply).
//   true  = offline profiles were accepted
//   false = Microsoft account required (the server asked for account authentication)
//   absent = couldn't tell (the server refused the check's game version, or didn't answer)
// Servers can change this at any time; the app says so wherever it shows it.
export const OFFLINE_CHECKED = "2026-10-08";

export type Mode =
  | "BedWars" | "SkyWars" | "SkyBlock" | "Survival" | "Lifesteal" | "Prison" | "Practice" | "Factions"
  | "Towny" | "Anarchy" | "RPG" | "Minigames" | "Parkour" | "Pixelmon" | "Battle royale" | "EggWars" | "Events" | "Community";

export type CatalogServer = { name: string; address: string; about: string; modes: Mode[]; offline?: boolean };

export const MODES: { id: Mode; blurb: string }[] = [
  { id: "BedWars", blurb: "Defend your bed, break theirs" },
  { id: "SkyWars", blurb: "Islands in the sky, last one standing" },
  { id: "SkyBlock", blurb: "Grow a world from one island" },
  { id: "Survival", blurb: "Classic survival with others" },
  { id: "Lifesteal", blurb: "Every kill takes a heart" },
  { id: "Prison", blurb: "Mine, rank up, break out" },
  { id: "Practice", blurb: "PvP duels and training" },
  { id: "Factions", blurb: "Bases, raids and alliances" },
  { id: "Towny", blurb: "Build towns and nations" },
  { id: "Anarchy", blurb: "No rules, no resets" },
  { id: "RPG", blurb: "Quests, classes, dungeons" },
  { id: "Minigames", blurb: "Quick rounds, many games" },
  { id: "Parkour", blurb: "Jump, run, beat the clock" },
  { id: "Pixelmon", blurb: "Catch and battle creatures" },
  { id: "Battle royale", blurb: "Drop in, loot, survive" },
  { id: "EggWars", blurb: "Protect your egg" },
  { id: "Events", blurb: "Scheduled tournaments" },
  { id: "Community", blurb: "Many player-run servers" },
];

export const CATALOG: CatalogServer[] = [
  { name: "Hypixel", address: "mc.hypixel.net", about: "The biggest minigame network: SkyBlock, Bed Wars, SkyWars and more.", modes: ["BedWars", "SkyBlock", "SkyWars", "Minigames"], offline: false },
  { name: "CubeCraft", address: "play.cubecraft.net", about: "EggWars, SkyWars, Parkour and other minigames.", modes: ["EggWars", "SkyWars", "Minigames"] },
  { name: "Wynncraft", address: "play.wynncraft.com", about: "A full MMORPG with quests, classes and dungeons.", modes: ["RPG"] },
  { name: "MCC Island", address: "play.mccisland.net", about: "Games from the team behind Minecraft Championship.", modes: ["Minigames", "Events"], offline: false },
  { name: "ManaCube", address: "play.manacube.com", about: "SkyBlock, Parkour, Survival and more.", modes: ["SkyBlock", "Parkour", "Survival"], offline: false },
  { name: "Minehut", address: "minehut.com", about: "Thousands of community-run servers, one address.", modes: ["Community"], offline: false },
  { name: "Origin Realms", address: "play.originrealms.com", about: "Survival with custom creatures, items and worlds.", modes: ["Survival", "RPG"] },
  { name: "PikaNetwork", address: "play.pika-network.net", about: "Survival, Skyblock, Bed Wars and Practice.", modes: ["BedWars", "SkyWars", "Survival", "Practice"], offline: true },
  { name: "Mineplex", address: "play.mineplex.com", about: "The classic minigame network, back again.", modes: ["Minigames"] },
  { name: "Jartex Network", address: "play.jartexnetwork.com", about: "Bed Wars, SkyWars, Skyblock, Prison and Factions.", modes: ["BedWars", "SkyWars", "SkyBlock", "Prison", "Factions"], offline: true },
  { name: "BlocksMC", address: "blocksmc.com", about: "Bed Wars, SkyWars and quick minigames.", modes: ["BedWars", "SkyWars", "Minigames"], offline: true },
  { name: "Mineberry", address: "play.mineberry.org", about: "Survival, anarchy, Bed Wars, SkyWars and KitPvP.", modes: ["Survival", "Anarchy", "BedWars", "SkyWars", "Practice"], offline: true },
  { name: "BedWars Practice", address: "bedwarspractice.club", about: "Practise Bed Wars bridging, clutches and duels.", modes: ["BedWars", "Practice"], offline: false },
  { name: "SkyBlock.net", address: "play.skyblock.net", about: "Classic SkyBlock, running for fifteen years.", modes: ["SkyBlock"], offline: false },
  { name: "Complex Gaming", address: "hub.mc-complex.com", about: "Pixelmon, Survival, Skyblock and more.", modes: ["Pixelmon", "Survival", "SkyBlock"], offline: false },
  { name: "FadeCloud", address: "play.fadecloud.com", about: "Skyblock, Prison and Lifesteal.", modes: ["SkyBlock", "Prison", "Lifesteal"], offline: false },
  { name: "OPBlocks", address: "play.opblocks.com", about: "Skyblock, Prison and Factions.", modes: ["SkyBlock", "Prison", "Factions"], offline: false },
  { name: "Lifesteal SMP", address: "lifesteal.net", about: "Survival where every kill steals a heart.", modes: ["Lifesteal", "Survival"], offline: false },
  { name: "LemonCloud", address: "play.lemoncloud.net", about: "Survival, Skyblock and Lifesteal.", modes: ["Survival", "SkyBlock", "Lifesteal"], offline: false },
  { name: "Gamster", address: "mc.gamster.org", about: "Survival seasons and more.", modes: ["Survival"], offline: true },
  { name: "Vanilla+", address: "play.vanillaplus.net", about: "Vanilla survival with small extras.", modes: ["Survival"], offline: false },
  { name: "EarthMC", address: "org.earthmc.net", about: "Towns and nations on a full-size map of Earth.", modes: ["Towny"] },
  { name: "CraftYourTown", address: "play.craftyourtown.com", about: "Towny survival with shops and an economy.", modes: ["Towny", "Survival"], offline: false },
  { name: "MineSuperior", address: "play.minesuperior.com", about: "Survival, Skyblock and Prison.", modes: ["Survival", "SkyBlock", "Prison"], offline: false },
  { name: "ExtremeCraft", address: "play.extremecraft.net", about: "Survival, Factions and Skyblock.", modes: ["Survival", "Factions", "SkyBlock"], offline: true },
  { name: "Wild Prison", address: "play.wildprison.net", about: "Prison with mines, gangs and ranks.", modes: ["Prison"], offline: false },
  { name: "Purple Prison", address: "purpleprison.net", about: "A long-running prison server.", modes: ["Prison"], offline: false },
  { name: "Minemen Club", address: "minemen.club", about: "Competitive PvP practice and ranked duels.", modes: ["Practice"] },
  { name: "Hoplite", address: "hoplite.gg", about: "Battle royale, Minecraft style.", modes: ["Battle royale"], offline: false },
  { name: "Minewind", address: "minewind.com", about: "Semi-anarchy survival with few rules.", modes: ["Anarchy", "Survival"], offline: false },
  { name: "2b2t", address: "2b2t.org", about: "The oldest anarchy server: no rules, no resets.", modes: ["Anarchy"], offline: false },
  { name: "Minefort", address: "play.minefort.com", about: "A hub for free community-run servers.", modes: ["Community"], offline: false },
];
