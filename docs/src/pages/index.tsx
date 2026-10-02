import type { ReactNode } from "react";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";

import styles from "./index.module.css";

const foundations = [
  ["01", "Compose", "Build scenes from focused, reusable tattvas."],
  ["02", "Animate", "Drive every frame with a deterministic timeline."],
  ["03", "Explain", "Turn mathematics and ideas into visual stories."],
] as const;

const capabilities = [
  {
    title: "A visual vocabulary",
    body: "Shapes, text, formulae, matrices, graphs, particles, surfaces, and reusable teaching components share one scene model.",
  },
  {
    title: "Time you can reason about",
    body: "Animations, callbacks, per-frame updaters, cameras, captures, audio, and export all follow the same deterministic timeline.",
  },
  {
    title: "Built for authored stories",
    body: "Move naturally from a mathematical construction to branded explainers, shorts, openings, and complete visual narratives.",
  },
] as const;

const learningPaths = [
  {
    label: "Start",
    title: "Create your first scene",
    body: "Install Murali, preview a scene, and render the result.",
    to: "/docs/getting-started/",
  },
  {
    label: "Explore",
    title: "Understand the API areas",
    body: "Find the right package for core scenes, primitives, maths, AI, text, and storytelling.",
    to: "/docs/api-overview/",
  },
  {
    label: "Build",
    title: "Browse working examples",
    body: "Use the repository examples as executable studies while the guides continue to grow.",
    href: "https://github.com/murali-engine/murali-js/tree/main/examples",
  },
  {
    label: "Reference",
    title: "Enter the documentation",
    body: "Follow the JavaScript documentation track and its release history.",
    to: "/docs/",
  },
] as const;

function MuraliMark(): ReactNode {
  return (
    <div className={styles.markStage} aria-hidden="true">
      <div className={styles.orbit} />
      <img className={styles.mark} src="/img/murali-mark.svg" alt="" />
      <span className={styles.axisX} />
      <span className={styles.axisY} />
      <span className={styles.pointOne} />
      <span className={styles.pointTwo} />
      <span className={styles.pointThree} />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}): ReactNode {
  return (
    <div className={styles.sectionHeading}>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <Heading as="h2">{title}</Heading>
      <p>{body}</p>
    </div>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Mathematics, beautifully in motion"
      description="Murali is a code-first JavaScript animation engine for mathematical and visual storytelling."
    >
      <main className={styles.home}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>JavaScript animation engine</span>
            <Heading as="h1">
              Mathematics, beautifully <em>in motion.</em>
            </Heading>
            <p>
              Compose precise, expressive visual stories with deterministic timelines and a
              growing library of reusable tattvas.
            </p>
            <div className={styles.heroActions}>
              <Link className={styles.primaryAction} to="/docs/">
                Start with the docs
              </Link>
              <Link
                className={styles.secondaryAction}
                href="https://github.com/murali-engine/murali-js/tree/main/examples"
              >
                Explore examples
              </Link>
            </div>
            <div className={styles.constructs} aria-label="Murali building blocks">
              <span>Scene</span><span>Timeline</span><span>Tattvas</span><span>Renderer</span>
            </div>
          </div>
          <MuraliMark />
        </section>

        <section className={styles.foundationStrip} aria-label="Murali foundations">
          {foundations.map(([number, title, description]) => (
            <article key={number}>
              <span>{number}</span>
              <div>
                <Heading as="h2">{title}</Heading>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </section>

        <section className={styles.section} id="capabilities">
          <SectionHeading
            eyebrow="Overview"
            title="One coherent system for visual explanation."
            body="Murali brings geometry, motion, rendering, and storytelling together so an idea can grow from a sketch into a polished animation without changing tools."
          />
          <div className={styles.capabilityGrid}>
            {capabilities.map((capability, index) => (
              <article key={capability.title} className={styles.capabilityCard}>
                <span>0{index + 1}</span>
                <Heading as="h3">{capability.title}</Heading>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.showcase}`} id="showcase">
          <SectionHeading
            eyebrow="Showcase"
            title="Designed for ideas that need to move."
            body="The same scene model can express a clean geometric proof, an AI concept, or a production-ready visual sequence."
          />
          <div className={styles.showcaseGrid}>
            <article className={styles.showcaseCard}>
              <div className={`${styles.visual} ${styles.geometryVisual}`} aria-hidden="true">
                <span /><span /><span />
              </div>
              <Heading as="h3">Mathematics</Heading>
              <p>Construct, transform, morph, highlight, and explain mathematical objects.</p>
            </article>
            <article className={styles.showcaseCard}>
              <div className={`${styles.visual} ${styles.aiVisual}`} aria-hidden="true">
                <i /><i /><i /><i /><b /><b /><b />
              </div>
              <Heading as="h3">AI and systems</Heading>
              <p>Turn networks, tensors, context, and information flow into understandable scenes.</p>
            </article>
            <article className={styles.showcaseCard}>
              <div className={`${styles.visual} ${styles.storyVisual}`} aria-hidden="true">
                <span /><span /><span />
              </div>
              <Heading as="h3">Visual storytelling</Heading>
              <p>Combine cameras, 3D, particles, audio, branding, and export into complete stories.</p>
            </article>
          </div>
        </section>

        <section className={styles.section} id="learn">
          <SectionHeading
            eyebrow="Learning paths"
            title="Begin with a scene, then grow from there."
            body="The JavaScript documentation is the natural path into Murali—from the first preview to reusable components and deeper API areas."
          />
          <div className={styles.pathGrid}>
            {learningPaths.map((path) => (
              <Link
                key={path.title}
                className={styles.pathCard}
                to={"to" in path ? path.to : undefined}
                href={"href" in path ? path.href : undefined}
              >
                <span>{path.label}</span>
                <Heading as="h3">{path.title}</Heading>
                <p>{path.body}</p>
                <strong>Continue →</strong>
              </Link>
            ))}
          </div>
        </section>

        <section className={styles.rustNote} aria-labelledby="rust-engine-title">
          <div>
            <span className={styles.eyebrow}>For specialised workloads</span>
            <Heading as="h2" id="rust-engine-title">
              Need to go beyond the JavaScript engine?
            </Heading>
            <p>
              Murali JavaScript is the main path for creating visual stories. For projects that
              need lower-level control or outgrow its current limits, Murali also has a Rust-based
              engine with its own documentation.
            </p>
          </div>
          <Link
            className={styles.rustAction}
            href="https://github.com/murali-engine/murali-rs/tree/main/docs"
          >
            Open Rust Murali documentation →
          </Link>
        </section>

        <section className={styles.closingCta}>
          <span className={styles.eyebrow}>Ready when the idea is</span>
          <Heading as="h2">Make the difficult thing visible.</Heading>
          <p>Start with the JavaScript guide and build the first version of your scene.</p>
          <Link className={styles.lightAction} to="/docs/getting-started/">
            Create a scene
          </Link>
        </section>
      </main>
    </Layout>
  );
}
