# Intended differences

- Byte display: binary MB/GB labels become MiB/GiB; infinity and invalid inputs display 0 MiB.
  Finite positive rounding preserved by differential test against the old function.
- Audio: a device-initialization failure no longer propagates from a click; maximum eight
  simultaneous effects; completed graphs disconnect. Tests use mocked Web Audio, not acoustic measurements.
- Skin preview: revoke temporary object URLs; decode images before applying to prevent stale requests
  replacing a newer selection; pause rendering while hidden; respect reduced-motion prop changes.
- Diagnostics: opt-in bounded local frontend trace, with fixed labels and no IPC argument collection.
- Release checks: reject missing publisher, invalid signatures or missing timestamps; no old artifact relabeled.

No intentional changes to page structure, styles, colors, navigation, account data or world identity.
