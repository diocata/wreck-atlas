"use client";

import {
  Anchor,
  ChevronRight,
  Clock3,
  Crosshair,
  MapPin,
  Search,
  SlidersHorizontal,
  Waves,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import styles from "./design-lab.module.css";

const directions = [
  {
    id: "signal",
    tab: "Signal white",
    name: "Signal White",
    note: "Recommended",
    summary: "Quiet editorial chrome with playful instrument tiles and precise cyan wreck beacons.",
    signature: "A plotted signal rail connects filters to the live chart.",
    colors: ["#F7F8FA", "#0B0D10", "#25D4C2", "#FF5B37", "#7357FF"],
  },
  {
    id: "arcade",
    tab: "Arcade sonar",
    name: "Arcade Sonar",
    note: "More playful",
    summary: "A sharper coin-op energy: hard black controls, score-like labels, and yellow target locks.",
    signature: "Every wreck behaves like a target acquired on a survey console.",
    colors: ["#FFFFFF", "#101114", "#28DDF2", "#FFE14D", "#795CFF"],
  },
  {
    id: "pearl",
    tab: "Pearl relay",
    name: "Pearl Relay",
    note: "Softest",
    summary: "Pearlescent control surfaces, lavender depth rings, and a more cinematic detail card.",
    signature: "Depth is visualized as a soft, tactile sonar dial.",
    colors: ["#FBFAFF", "#17121F", "#66DFCC", "#FF715C", "#8C64FF"],
  },
] as const;

const wrecks = [
  {
    name: "RMS Titanic",
    kind: "Ocean liner",
    year: "1912",
    depth: "3,800 m",
    position: "41.7325° N · 49.9483° W",
    story: "The North Atlantic wreck is plotted as an approximate reference for exploration.",
  },
  {
    name: "Mary Rose",
    kind: "Warship",
    year: "1545",
    depth: "13 m",
    position: "50.7631° N · 1.1045° W",
    story: "A Tudor warship and one of the most closely studied maritime archaeological sites.",
  },
  {
    name: "Thistlegorm",
    kind: "Cargo ship",
    year: "1941",
    depth: "30 m",
    position: "27.8167° N · 33.9209° E",
    story: "A Red Sea wreck whose cargo and structure make it a distinctive underwater archive.",
  },
] as const;

export function DesignLab() {
  const [directionId, setDirectionId] = useState<(typeof directions)[number]["id"]>("signal");
  const [wreckIndex, setWreckIndex] = useState(0);
  const direction = directions.find((item) => item.id === directionId) ?? directions[0];
  const wreck = wrecks[wreckIndex];

  return (
    <main className={styles.lab} data-direction={direction.id}>
      <header className={styles.labHeader}>
        <Link className={styles.backLink} href="/">
          <Anchor size={15} aria-hidden="true" />
          Wreck Atlas
        </Link>
        <div className={styles.intro}>
          <span>Visual calibration · 01</span>
          <h1>Clean water.<br />Arcade signal.</h1>
          <p>
            Three light directions using the same atlas components. Change direction, then click a wreck
            beacon to feel the system.
          </p>
        </div>
        <div className={styles.directionTabs} aria-label="Choose a design direction">
          {directions.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={direction.id === item.id}
              onClick={() => setDirectionId(item.id)}
            >
              <span>{item.tab}</span>
              <small>{item.note}</small>
            </button>
          ))}
        </div>
      </header>

      <section className={styles.directionCopy} aria-live="polite">
        <div>
          <span className={styles.eyebrow}>Direction / {direction.note}</span>
          <h2>{direction.name}</h2>
        </div>
        <p>{direction.summary}</p>
        <div className={styles.palette} aria-label={`${direction.name} color palette`}>
          {direction.colors.map((color) => (
            <i key={color} style={{ background: color }} title={color} />
          ))}
        </div>
      </section>

      <section className={styles.stage} aria-label={`${direction.name} atlas interface mockup`}>
        <div className={styles.atlasBar}>
          <div className={styles.atlasBrand}>
            <span><Anchor size={16} aria-hidden="true" /></span>
            <b>Wreck Atlas</b>
            <i>β</i>
          </div>
          <div className={styles.atlasSearch}>
            <Search size={16} aria-hidden="true" />
            <span>Find a wreck or coastline</span>
          </div>
          <button type="button" className={styles.eraButton}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            Era
          </button>
        </div>

        <div className={styles.signalRail} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>

        <div className={styles.modeTiles} aria-label="Atlas modes">
          <button type="button">
            <Crosshair size={22} aria-hidden="true" />
            <span>Wrecks</span>
          </button>
          <button type="button">
            <Waves size={22} aria-hidden="true" />
            <span>Depth</span>
          </button>
          <button type="button">
            <Clock3 size={22} aria-hidden="true" />
            <span>Era</span>
          </button>
        </div>

        <div className={styles.chart}>
          <div className={styles.chartMeta}>
            <span>NORTH ATLANTIC / SECTOR 04</span>
            <code>ZOOM 1.5</code>
          </div>
          <div className={styles.sonarArc} aria-hidden="true" />
          <div className={`${styles.coast} ${styles.coastOne}`} aria-hidden="true" />
          <div className={`${styles.coast} ${styles.coastTwo}`} aria-hidden="true" />

          {wrecks.map((item, index) => (
            <button
              type="button"
              key={item.name}
              className={`${styles.beacon} ${styles[`beacon${index + 1}`]}`}
              aria-label={`Select ${item.name}`}
              aria-pressed={wreckIndex === index}
              onClick={() => setWreckIndex(index)}
            >
              <span />
              <small>{index === wreckIndex ? "LOCKED" : String(index + 1).padStart(2, "0")}</small>
            </button>
          ))}

          <button type="button" className={styles.cluster} aria-label="Cluster of five wrecks">
            <span>5</span>
            <small>CHANNEL</small>
          </button>
        </div>

        <aside className={styles.wreckCard} aria-label={`${wreck.name} preview`}>
          <button type="button" className={styles.closeButton} aria-label="Close preview">
            <X size={15} />
          </button>
          <span className={styles.cardKicker}><Crosshair size={13} /> Signal confirmed</span>
          <h3>{wreck.name}</h3>
          <p className={styles.kind}>{wreck.kind}</p>
          <div className={styles.facts}>
            <span><Clock3 size={14} /> {wreck.year}</span>
            <span><Waves size={14} /> {wreck.depth}</span>
          </div>
          <p className={styles.story}>{wreck.story}</p>
          <button type="button" className={styles.openRecord}>
            Open record <ChevronRight size={14} />
          </button>
          <div className={styles.coordinates}>
            <span><MapPin size={13} /> Approximate position</span>
            <code>{wreck.position}</code>
          </div>
        </aside>

        <div className={styles.chartFooter}>
          <span>UKHO · OGL</span>
          <span>OSM · OPENFREEMAP</span>
          <strong>NOT FOR NAVIGATION</strong>
        </div>
      </section>

      <section className={styles.componentBoard}>
        <div className={styles.boardIntro}>
          <span className={styles.eyebrow}>Component check</span>
          <h2>The visual language,<br />away from the map.</h2>
          <p>{direction.signature}</p>
        </div>

        <article className={styles.componentCard}>
          <span className={styles.componentLabel}>Targets</span>
          <div className={styles.targetSamples}>
            <span className={styles.samplePoint} />
            <span className={styles.sampleLocked}><i /> LOCK</span>
            <span className={styles.sampleCluster}>12</span>
          </div>
          <p>One point, one selected state, one cluster.</p>
        </article>

        <article className={styles.componentCard}>
          <span className={styles.componentLabel}>Controls</span>
          <div className={styles.controlSamples}>
            <button type="button"><Search size={14} /> Search the atlas</button>
            <button type="button"><SlidersHorizontal size={14} /> 1900–1945</button>
          </div>
          <p>Quiet by default; unmistakable when active.</p>
        </article>

        <article className={styles.componentCard}>
          <span className={styles.componentLabel}>Depth token</span>
          <div className={styles.depthToken}>
            <span><Waves size={22} /></span>
            <div><strong>{wreck.depth}</strong><small>recorded depth</small></div>
          </div>
          <p>The arcade character is concentrated in data tokens.</p>
        </article>
      </section>

      <footer className={styles.labFooter}>
        <span>Design lab · choose a direction, then we apply it to the live atlas.</span>
        <Link href="/">Return to current atlas <ChevronRight size={14} /></Link>
      </footer>
    </main>
  );
}
