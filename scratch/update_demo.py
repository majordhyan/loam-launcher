with open('src/App.tsx', 'r', encoding='utf-8', newline='') as f:
    content = f.read()

replacement = """const demoSnapshot: Snapshot = {
  data: {
    schema: 1,
    games: [
      {
        id: "g-fabric",
        name: "Fabric 1.21.4",
        version: "1.21.4",
        loader: "fabric",
        memory: 6144,
        width: 1920,
        height: 1080,
        jvmArgs: ["-XX:+UseG1GC", "-XX:G1ReservePercent=15"],
        installed: true,
        verified: "2026-10-01",
        created: "2026-10-01",
      },
      {
        id: "g-vanilla",
        name: "Vanilla 1.20.4",
        version: "1.20.4",
        loader: null,
        memory: 4096,
        width: 1920,
        height: 1080,
        jvmArgs: [],
        installed: true,
        verified: "2026-09-20",
        created: "2026-09-20",
      },
      {
        id: "g-quilt",
        name: "Quilt 1.21.1",
        version: "1.21.1",
        loader: "quilt",
        memory: 4096,
        width: 1920,
        height: 1080,
        jvmArgs: [],
        installed: true,
        verified: "2026-09-25",
        created: "2026-09-25",
      },
    ],
    accounts: [
      {
        id: "acc-1",
        name: "Dhyan",
        kind: "offline",
        uuid: "85310931-5d2a-4727-82b6-833b9340916d",
      },
    ],
    selectedGame: "g-fabric",
    selectedAccount: "acc-1",
    preferences: { snapshots: true, setupDone: true, reducedMotion: false },
  },
  operation: null,
  running: {},
  root: "C:\\\\Users\\\\Dhyan\\\\AppData\\\\Local\\\\Programs\\\\LOAM",
  ramMB: 16384,
  freeDisk: 124000,
  version: "1.5.1",
  capabilities: { windows: { perf: true, memoryTrim: true } },
  configuration: { microsoft: false, discord: false, updates: true },
};

export default function App() {
  const isDemo = typeof window !== "undefined" && !native && window.location.search.includes("demo=1");
  const initialPage = isDemo && window.location.search.includes("page=settings")
    ? "settings"
    : (isDemo && window.location.search.includes("page=skins")
      ? "skins"
      : (isDemo && window.location.search.includes("page=dev") ? "dev" : "home"));
  const [snap, setSnap] = useState<Snapshot>(() => (isDemo ? demoSnapshot : empty)),
    [page, setPageState] = useState(initialPage),"""

idx = content.find('export default function App() {')
end_idx = content.find('[sheet, setSheet]', idx)

to_replace = content[idx:end_idx]
new_content = content[:idx] + replacement + "\r\n    " + content[end_idx:]

with open('src/App.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(new_content)

print('SUCCESSFULLY UPDATED APP.TSX')
