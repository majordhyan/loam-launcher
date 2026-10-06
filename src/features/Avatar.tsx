import { useEffect, useState } from "react";
import { UserRound } from "lucide-react";
import { call, native, type Account } from "../api";

const cacheKey = (id: string) => `loam_skin_${id}`;

function cached(id: string): string | null {
  try {
    return localStorage.getItem(cacheKey(id));
  } catch {
    return null;
  }
}

/**
 * Pixel-exact player head (face + hat layer) cropped from the account's skin.
 * The last known skin is cached locally so the head paints on first frame;
 * the native skin cache is checked afterwards and only swaps if it changed.
 */
export function Avatar({ account, size = 28 }: { account?: Account; size?: number }) {
  const [skin, setSkin] = useState<string | null>(() => (account ? cached(account.id) : null));
  useEffect(() => {
    if (!account) {
      setSkin(null);
      return;
    }
    setSkin(cached(account.id));
    if (!native) return;
    let live = true;
    void call<string | null>("accountSkin", { id: account.id })
      .then((v) => {
        if (!live) return;
        try {
          if (v) localStorage.setItem(cacheKey(account.id), v);
          else localStorage.removeItem(cacheKey(account.id));
        } catch {
          /* storage unavailable: keep the in-memory value */
        }
        setSkin(v);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [account?.id, account?.verified]);
  if (!account) return <UserRound size={Math.round(size * 0.55)} />;
  if (!skin)
    return (
      <span className="avatar-initials" aria-hidden="true">
        {account.name.slice(0, 2).toUpperCase()}
      </span>
    );
  // A 64 px-wide skin has the face at (8,8) and the hat layer at (40,8), both 8×8.
  const s = Math.round(size * 0.72);
  const url = `url("${skin.replace(/"/g, "%22")}")`;
  return (
    <span
      className="skin-head"
      role="img"
      aria-label={`${account.name}'s Minecraft head`}
      style={{
        width: s,
        height: s,
        backgroundImage: `${url}, ${url}`,
        backgroundSize: `${s * 8}px auto, ${s * 8}px auto`,
        backgroundPosition: `${-s * 5}px ${-s}px, ${-s}px ${-s}px`,
      }}
    />
  );
}

/** "Java Edition ✓" for Microsoft accounts that passed the entitlement check. */
export function AccountBadge({ account }: { account?: Account }) {
  if (!account) return <>Click to sign in</>;
  if (account.kind !== "microsoft") return <>Offline profile</>;
  return account.verified ? (
    <span className="java-badge" title={`Minecraft: Java Edition access confirmed ${new Date(account.verified).toLocaleString()}`}>
      Java Edition ✓
    </span>
  ) : (
    <>Microsoft</>
  );
}
