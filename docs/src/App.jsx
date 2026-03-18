import { useEffect, useMemo, useRef, useState } from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTime,
  useTransform
} from "framer-motion";
import { ArrowRight, Check, Copy, Github } from "lucide-react";
import {
  SiAnthropic,
  SiNestjs,
  SiNextdotjs,
  SiOpenai,
  SiReact,
  SiTypescript
} from "react-icons/si";
import { GITHUB_URL, INSTALL_COMMAND, navItems, outputItems, steps } from "./content";

const inboundNodes = [
  { label: "TypeScript", Icon: SiTypescript, tone: "#3178c6", className: "network-node-left-1" },
  { label: "React", Icon: SiReact, tone: "#61dafb", className: "network-node-left-2" },
  { label: "Next.js", Icon: SiNextdotjs, tone: "#f4f6f8", className: "network-node-left-3" },
  { label: "NestJS", Icon: SiNestjs, tone: "#e0234e", className: "network-node-left-4" }
];

const outboundNodes = [
  { label: "Codex", Icon: SiOpenai, tone: "#f3f5f7", className: "network-node-right-1" },
  { label: "Claude", Icon: SiAnthropic, tone: "#d5bea0", className: "network-node-right-2" },
  { label: "Cursor", Icon: CursorMark, tone: "#f3eee2", className: "network-node-right-3" }
];

const SIGNAL_CYCLE = 4.8;
const SIGNAL_TRAVEL = 1.02;

const inboundPaths = [
  { key: "in-1", start: [166, 84], control: [258, 84], end: [344, 188], startAt: 0 },
  { key: "in-2", start: [170, 166], control: [272, 174], end: [344, 202], startAt: 0.16 },
  { key: "in-3", start: [166, 250], control: [272, 238], end: [344, 218], startAt: 0.32 },
  { key: "in-4", start: [170, 334], control: [258, 334], end: [344, 232], startAt: 0.48 }
];

const outboundPaths = [
  { key: "out-1", start: [416, 188], control: [518, 110], end: [614, 110], startAt: 1.58 },
  { key: "out-2", start: [416, 208], control: [530, 168], end: [614, 216], startAt: 1.76 },
  { key: "out-3", start: [416, 232], control: [518, 310], end: [614, 310], startAt: 1.94 }
];

function toQuadraticPath(path) {
  return `M ${path.start[0]} ${path.start[1]} Q ${path.control[0]} ${path.control[1]} ${path.end[0]} ${path.end[1]}`;
}

function pointOnQuadratic(path, t) {
  const [sx, sy] = path.start;
  const [cx, cy] = path.control;
  const [ex, ey] = path.end;
  const inv = 1 - t;

  return {
    x: inv * inv * sx + 2 * inv * t * cx + t * t * ex,
    y: inv * inv * sy + 2 * inv * t * cy + t * t * ey
  };
}

function CursorMark(props) {
  return (
    <svg viewBox="400 395 167 191" fill="none" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M563.463 439.971L487.344 396.057C484.899 394.646 481.883 394.646 479.439 396.057L403.323 439.971C401.269 441.156 400 443.349 400 445.723V534.276C400 536.647 401.269 538.843 403.323 540.029L479.443 583.943C481.887 585.353 484.903 585.353 487.347 583.943L563.466 540.029C565.521 538.843 566.79 536.651 566.79 534.276V445.723C566.79 443.352 565.521 441.156 563.466 439.971H563.463ZM558.681 449.273L485.199 576.451C484.703 577.308 483.391 576.958 483.391 575.966V492.691C483.391 491.027 482.501 489.488 481.058 488.652L408.887 447.016C408.03 446.52 408.38 445.209 409.373 445.209H556.337C558.424 445.209 559.728 447.47 558.685 449.276H558.681V449.273Z"
      />
    </svg>
  );
}

function CopyButton({ compact = false, text }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef();

  useEffect(() => {
    return () => window.clearTimeout(timeoutRef.current);
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      window.clearTimeout(timeoutRef.current);
      setCopied(true);
      timeoutRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      className={`copy-button${compact ? " copy-inline" : ""}${copied ? " is-copied" : ""}`}
      type="button"
      aria-label={copied ? "Copied" : "Copy install command"}
      onClick={handleCopy}
    >
      <span className="copy-icons" aria-hidden="true">
        {copied ? <Check size={16} /> : <Copy size={16} />}
      </span>
      <span className="copy-label">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function useActiveSection(sectionIds) {
  const [activeSection, setActiveSection] = useState(sectionIds[0] ?? "top");

  useEffect(() => {
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio)[0];

        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      {
        threshold: [0.2, 0.4, 0.6],
        rootMargin: "-25% 0px -35% 0px"
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [sectionIds]);

  return activeSection;
}

function Reveal({ children, className = "", delay = 0 }) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.22 }}
      transition={{ duration: 0.68, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function SectionHead({ eyebrow, title, copy }) {
  return (
    <Reveal className="section-head">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{copy}</p>
    </Reveal>
  );
}

function Panel({ as: Component = motion.div, className = "", children, hover = true, ...props }) {
  const reduceMotion = useReducedMotion();

  return (
    <Component
      className={`panel ${className}`.trim()}
      whileHover={reduceMotion || !hover ? undefined : { y: -4 }}
      transition={{ duration: 0.24, ease: [0.2, 0.8, 0.2, 1] }}
      {...props}
    >
      {children}
    </Component>
  );
}

function NetworkNode({ item, index }) {
  const reduceMotion = useReducedMotion();
  const { Icon, label, tone } = item;

  return (
    <motion.div
      className={`network-node ${item.className}`}
      style={{ "--brand-tone": tone }}
      animate={
        reduceMotion
          ? undefined
          : {
              y: index % 2 === 0 ? [-2, 4, -2] : [3, -2, 3]
            }
      }
      transition={{
        duration: 6 + index,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut"
      }}
    >
      <span className="network-node-icon">
        <Icon size={20} />
      </span>
      <span className="network-node-label">{label}</span>
    </motion.div>
  );
}

function SyncedSignal({ activeClassName, path }) {
  const reduceMotion = useReducedMotion();
  const time = useTime();
  const progress = useTransform(time, (latest) => {
    const elapsed = ((latest / 1000 - path.startAt) % SIGNAL_CYCLE + SIGNAL_CYCLE) % SIGNAL_CYCLE;
    if (elapsed > SIGNAL_TRAVEL) {
      return 0;
    }
    return elapsed / SIGNAL_TRAVEL;
  });

  const opacity = useTransform(progress, (value) => {
    if (value === 0) {
      return 0;
    }
    if (value < 0.12) {
      return value / 0.12;
    }
    if (value > 0.88) {
      return (1 - value) / 0.12;
    }
    return 1;
  });
  const glowOpacity = useTransform(opacity, (value) => value * 0.48);
  const cx = useTransform(progress, (value) => pointOnQuadratic(path, value).x);
  const cy = useTransform(progress, (value) => pointOnQuadratic(path, value).y);
  const pathLength = useTransform(progress, (value) => value);

  if (reduceMotion) {
    return null;
  }

  return (
    <>
      <motion.path
        d={toQuadraticPath(path)}
        className={`network-link-active ${activeClassName}`}
        style={{ pathLength, opacity }}
      />
      <motion.circle className="network-pulse network-pulse-soft" r="5.5" style={{ cx, cy, opacity: glowOpacity }} />
      <motion.circle className="network-pulse" r="3.5" style={{ cx, cy, opacity }} />
    </>
  );
}

function HeroVisual() {
  return (
    <Reveal className="hero-visual" delay={0.12}>
      <Panel className="network-panel" hover={false} aria-hidden="true">
        <div className="signal-topline">Context router</div>

        <div className="network-canvas">
          <svg className="network-links" viewBox="0 0 760 420" preserveAspectRatio="none">
            <defs>
              <linearGradient id="mid-line-in" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.32)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
              </linearGradient>
              <linearGradient id="mid-line-out" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0.34)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
              </linearGradient>
              <linearGradient id="mid-line-in-active" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
                <stop offset="48%" stopColor="rgba(255,255,255,0.9)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.18)" />
              </linearGradient>
              <linearGradient id="mid-line-out-active" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
                <stop offset="48%" stopColor="rgba(255,255,255,0.92)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.06)" />
              </linearGradient>
            </defs>

            {inboundPaths.map((path) => (
              <path key={path.key} d={toQuadraticPath(path)} className="network-link inbound-link" />
            ))}

            {outboundPaths.map((path) => (
              <path key={path.key} d={toQuadraticPath(path)} className="network-link outbound-link" />
            ))}

            {inboundPaths.map((path) => (
              <SyncedSignal key={`${path.key}-active`} activeClassName="inbound-link-active" path={path} />
            ))}

            {outboundPaths.map((path) => (
              <SyncedSignal key={`${path.key}-active`} activeClassName="outbound-link-active" path={path} />
            ))}
          </svg>

          {inboundNodes.map((item, index) => (
            <NetworkNode key={item.label} item={item} index={index} />
          ))}

          <div className="network-core-wrap">
            <motion.div
              className="core-bloom"
              animate={{ scale: [0.92, 1.08, 0.96], opacity: [0.32, 0.82, 0.34] }}
              transition={{ duration: SIGNAL_CYCLE, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            />
            <motion.div
              className="core-ring core-ring-outer"
              animate={{ rotate: 360 }}
              transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
            <motion.div
              className="core-ring core-ring-inner"
              animate={{ rotate: -360 }}
              transition={{ duration: 16, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
            />
            <motion.div
              className="core-orb"
              animate={{ scale: [0.98, 1.06, 0.99] }}
              transition={{ duration: SIGNAL_CYCLE, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <span>mid</span>
            </motion.div>
          </div>

          {outboundNodes.map((item, index) => (
            <NetworkNode key={item.label} item={item} index={index} />
          ))}
        </div>

        <p className="signal-caption">
          Standards in. Native assistant instructions out.
        </p>
      </Panel>
    </Reveal>
  );
}

function App() {
  const sectionIds = useMemo(() => navItems.map((item) => item.id), []);
  const activeSection = useActiveSection(sectionIds);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const drift = useSpring(scrollYProgress, { stiffness: 70, damping: 20, mass: 0.4 });
  const gridY = useTransform(drift, (value) => value * -110);

  return (
    <MotionConfig transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}>
      <div className="site-shell">
        <motion.div
          className="ambient ambient-one"
          aria-hidden="true"
          animate={reduceMotion ? undefined : { x: [0, 28, 0], y: [0, -16, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div
          className="ambient ambient-two"
          aria-hidden="true"
          animate={reduceMotion ? undefined : { x: [0, -24, 0], y: [0, 18, 0], scale: [1, 0.98, 1] }}
          transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        />
        <motion.div className="ambient ambient-grid" aria-hidden="true" style={reduceMotion ? undefined : { y: gridY }} />

        <header className="site-header">
          <nav className="nav container" aria-label="Primary">
            <a className="brand" href="#top">
              <span className="brand-mark">mid</span>
              <span className="brand-note">mark it down</span>
            </a>

            <div className="nav-links">
              {navItems.map((item) => (
                <a key={item.id} href={`#${item.id}`} className={activeSection === item.id ? "is-active" : ""}>
                  {item.label}
                </a>
              ))}
            </div>

            <a className="button button-ghost nav-action" href={GITHUB_URL} target="_blank" rel="noreferrer">
              <Github size={16} />
              <span>GitHub</span>
            </a>
          </nav>
        </header>

        <main>
          <section className="hero section container" id="top">
            <Reveal className="hero-copy">
              <p className="eyebrow">Project-specific AI instructions</p>
              <h1>Smart AI Context</h1>
              <p className="lead">
                mid turns reusable markdown standards into tight entrypoints for Codex, Claude Code, and Cursor.
              </p>

              <div className="hero-actions">
                <a className="button button-solid" href="#install">
                  <span>Install mid</span>
                  <ArrowRight size={16} />
                </a>
                <a className="button button-ghost" href={GITHUB_URL} target="_blank" rel="noreferrer">
                  <Github size={16} />
                  <span>View GitHub</span>
                </a>
              </div>

              <Panel className="command-card">
                <div className="command-head">
                  <span className="command-label">Install</span>
                  <span className="status-chip">Global</span>
                </div>

                <div className="command-shell">
                  <code>{INSTALL_COMMAND}</code>
                  <CopyButton text={INSTALL_COMMAND} />
                </div>

                <div className="command-sublist">
                  <div className="mini-command">
                    <span>One-off</span>
                    <code>npx midtool</code>
                  </div>
                  <div className="mini-command">
                    <span>Run</span>
                    <code>mid</code>
                  </div>
                </div>
              </Panel>
            </Reveal>

            <HeroVisual />
          </section>

          <section className="section container" id="flow">
            <SectionHead
              eyebrow="How it works"
              title="Small router. Fast setup."
              copy="Select the stack, pick the assistants, and generate only the instruction surface you need."
            />

            <div className="step-grid">
              {steps.map((step, index) => (
                <Reveal key={step.title} delay={0.08 * index}>
                  <Panel className="step-card">
                    <span className="step-number">0{index + 1}</span>
                    <h3>{step.title}</h3>
                    <p>{step.copy}</p>
                  </Panel>
                </Reveal>
              ))}
            </div>
          </section>

          <section className="section container" id="install">
            <SectionHead
              eyebrow="Install"
              title="One command. Native outputs."
              copy="Install once, then run `mid` inside any project root."
            />

            <div className="install-layout">
              <Reveal delay={0.05}>
                <Panel className="install-card">
                  <h3>Primary path</h3>
                  <div className="install-callout">
                    <code>{INSTALL_COMMAND}</code>
                    <CopyButton text={INSTALL_COMMAND} compact />
                  </div>
                  <div className="mini-command-list">
                    <div className="mini-command">
                      <span>Regenerate</span>
                      <code>mid sync</code>
                    </div>
                    <div className="mini-command">
                      <span>Clean up</span>
                      <code>mid kill --backup</code>
                    </div>
                  </div>
                </Panel>
              </Reveal>

              <Reveal delay={0.12}>
                <Panel className="install-card">
                  <h3>Generated for the project</h3>
                  <ul className="output-list">
                    {outputItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <a className="text-link" href={GITHUB_URL} target="_blank" rel="noreferrer">
                    <span>Open the repository</span>
                    <ArrowRight size={15} />
                  </a>
                </Panel>
              </Reveal>
            </div>
          </section>
        </main>

        <footer className="site-footer container">
          <a className="brand brand-footer" href="#top">
            <span className="brand-mark">mid</span>
            <span className="brand-note">tight context for serious agents</span>
          </a>

          <div className="footer-links">
            <a href="#top">Back to top</a>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </div>
        </footer>
      </div>
    </MotionConfig>
  );
}

export default App;
