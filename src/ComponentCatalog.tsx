import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Sparkles,
} from "lucide-react";
import {
  PageShell,
  Toggle,
  Segmented,
  CustomSelect,
  Slider,
  Chip,
  Card,
  Drawer,
  Skeleton,
  StrataContour,
} from "./ui";

export default function ComponentCatalog({
  onNavigate,
  onCommandPalette,
}: {
  onNavigate: (route: string) => void;
  onCommandPalette: () => void;
}) {
  const [toggleState, setToggleState] = useState(true);
  const [segmentedVal, setSegmentedVal] = useState("one");
  const [selectVal, setSelectVal] = useState("fabric");
  const [sliderVal, setSliderVal] = useState(4096);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <PageShell
      route="dev"
      title="Component Catalog"
      eyebrow="SYSTEM · DEV SPECIFICATIONS"
      description="Design system tokens, interactive controls, and states for LOAM Launcher."
      onNavigate={onNavigate}
      onCommandPalette={onCommandPalette}
      badge="DEV ONLY"
    >
      <div className="catalog-sections">
        {/* SECTION 1: BUTTONS */}
        <section className="catalog-section">
          <h2>Buttons & Action Controls</h2>
          <p className="catalog-lead">
            Primary (large / small), secondary, and text actions.
          </p>

          <div className="catalog-grid">
            <div className="catalog-cell">
              <span className="eyebrow">PRIMARY (LARGE · 72PX)</span>
              <button
                type="button"
                className="play-button"
                style={{ width: "100%", maxWidth: "340px" }}
              >
                <span>PLAY</span>
                <ArrowRight size={24} />
              </button>
            </div>

            <div className="catalog-cell">
              <span className="eyebrow">PRIMARY (SMALL · 44PX)</span>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button type="button" className="primary">
                  <span>CONFIRM</span>
                  <Check size={16} />
                </button>
                <button type="button" className="primary" disabled>
                  <span>DISABLED</span>
                </button>
              </div>
            </div>

            <div className="catalog-cell">
              <span className="eyebrow">SECONDARY (44PX)</span>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                <button type="button" className="secondary">
                  <span>REVIEW INSTALL</span>
                  <ArrowRight size={16} />
                </button>
                <button type="button" className="secondary" disabled>
                  <span>DISABLED</span>
                </button>
              </div>
            </div>

            <div className="catalog-cell">
              <span className="eyebrow">TEXT ACTION</span>
              <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                <button type="button" className="text-button">
                  <span>OPEN DISCORD</span>
                  <ArrowUpRight size={15} />
                </button>
                <button type="button" className="text-button" disabled>
                  <span>DISABLED</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: TOGGLES & SEGMENTED */}
        <section className="catalog-section">
          <h2>Toggles & Segmented Controls</h2>
          <p className="catalog-lead">
            Unified switch for all booleans and segmented selection for options.
          </p>

          <div className="catalog-grid">
            <div className="catalog-cell">
              <span className="eyebrow">TOGGLE (44X24)</span>
              <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Toggle
                    checked={toggleState}
                    onChange={setToggleState}
                    ariaLabel="Demo toggle"
                  />
                  <span>Active ({toggleState ? "On" : "Off"})</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Toggle
                    checked={false}
                    disabled
                    onChange={() => {}}
                    ariaLabel="Disabled toggle"
                  />
                  <span className="muted">Disabled</span>
                </label>
              </div>
            </div>

            <div className="catalog-cell">
              <span className="eyebrow">SEGMENTED CONTROL (40PX)</span>
              <Segmented
                value={segmentedVal}
                onChange={setSegmentedVal}
                options={[
                  { value: "one", label: "Vanilla" },
                  { value: "two", label: "Fabric" },
                  { value: "three", label: "Quilt" },
                  { value: "four", label: "N/A", disabled: true },
                ]}
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: LISTBOX / CUSTOM SELECT */}
        <section className="catalog-section">
          <h2>Listbox / CustomSelect</h2>
          <p className="catalog-lead">
            Replaces native selects with keyboard accessibility, custom badges, and clean popover shadows.
          </p>

          <div className="catalog-grid">
            <div className="catalog-cell" style={{ maxWidth: "340px" }}>
              <CustomSelect
                label="SELECT LOADER"
                value={selectVal}
                onChange={setSelectVal}
                options={[
                  { value: "vanilla", label: "Vanilla (Clean)", badge: "Official" },
                  { value: "fabric", label: "Fabric 0.16.9", badge: "Active" },
                  { value: "quilt", label: "Quilt 0.27.1" },
                  { value: "forge", label: "Forge 47.3.0", badge: "Legacy" },
                ]}
              />
            </div>
          </div>
        </section>

        {/* SECTION 4: SLIDER */}
        <section className="catalog-section">
          <h2>Memory Slider</h2>
          <p className="catalog-lead">
            Full-width slider with recommended marker, tick bounds, and mono readout.
          </p>

          <div className="catalog-cell" style={{ maxWidth: "600px" }}>
            <Slider
              value={sliderVal}
              min={1024}
              max={16384}
              step={512}
              recommended={4096}
              label="HEAP MEMORY ALLOCATION"
              onChange={setSliderVal}
            />
          </div>
        </section>

        {/* SECTION 5: CHIPS & CARDS */}
        <section className="catalog-section">
          <h2>Chips & Cards</h2>
          <p className="catalog-lead">
            28px metadata chips and standard cards with subtle hover border.
          </p>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
            <Chip variant="default">Vanilla · Clean</Chip>
            <Chip variant="mono">4 GB</Chip>
            <Chip variant="accent">Java 25</Chip>
            <Chip
              variant="status"
              icon={<Sparkles size={14} color="var(--loam-accent)" />}
            >
              Verified today
            </Chip>
            <Chip
              variant="default"
              onClick={() => setDrawerOpen(true)}
            >
              DETAILS ⌄
            </Chip>
          </div>

          <div className="catalog-grid">
            <Card hoverable className="catalog-card-demo">
              <span className="eyebrow">INTERACTIVE CARD</span>
              <h3>Single standard border</h3>
              <p>Hover darkens border by 1 px without size or position shift.</p>
            </Card>

            <Card className="catalog-card-demo">
              <span className="eyebrow">STATIC CARD</span>
              <h3>Information card</h3>
              <p>Provides consistent framing with 1 px line border and 4 px radius.</p>
            </Card>
          </div>
        </section>

        {/* SECTION 6: SKELETON & STRATA */}
        <section className="catalog-section">
          <h2>Skeleton & Strata Contour</h2>
          <p className="catalog-lead">
            Static sunken skeletons (no infinite shimmer) and deterministic contour art.
          </p>

          <div className="catalog-grid">
            <div className="catalog-cell">
              <span className="eyebrow">SKELETONS (STATIC)</span>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <Skeleton width="180px" height="24px" />
                <Skeleton width="100%" height="48px" />
                <Skeleton width="60%" height="16px" />
              </div>
            </div>

            <div className="catalog-cell">
              <span className="eyebrow">STRATA CONTOUR</span>
              <div
                style={{
                  height: "120px",
                  background: "var(--loam-white)",
                  border: "1px solid var(--loam-line)",
                  borderRadius: "4px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <StrataContour seed="catalog-preview" />
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* DEMO DRAWER */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Game Details"
        eyebrow="DRAWER COMPONENT (420PX)"
      >
        <p>
          Right-side 420 px drawer with smooth enter animation, soft shadow, and accessible escape trigger.
        </p>
        <div style={{ marginTop: "24px" }}>
          <button
            type="button"
            className="secondary"
            onClick={() => setDrawerOpen(false)}
          >
            CLOSE DRAWER
          </button>
        </div>
      </Drawer>
    </PageShell>
  );
}
