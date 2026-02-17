import { Link } from "react-router-dom";

const valuePills = ["12 Subjects", "PYQ + Notes", "AI Planner", "Peer Rated"];

const featureCards = [
  {
    title: "Discover Faster",
    text: "Search subject-wise notes, previous papers, and research summaries in one clean flow.",
  },
  {
    title: "Upload Better",
    text: "Student-friendly upload with quality checks, tags, and duplicate-aware suggestions.",
  },
  {
    title: "Plan Smarter",
    text: "Set target grade, attendance, hours, and consistency for adaptive weekly roadmaps.",
  },
];

const tickerItems = [
  "Data Structures",
  "Algorithms",
  "DBMS",
  "Operating Systems",
  "Computer Networks",
  "Software Engineering",
  "Artificial Intelligence",
  "Machine Learning",
  "Compiler Design",
  "Theory of Computation",
  "Cyber Security",
  "Cloud Computing",
];

const flowSteps = [
  { title: "Step 1", text: "Login and select your semester + subjects." },
  { title: "Step 2", text: "Open notes/PYQs or upload your best material." },
  { title: "Step 3", text: "Use AI planner to hit your target grade." },
];

export default function IntroPage() {
  return (
    <section className="intro-premium-shell">
      <div className="intro-premium-noise" aria-hidden="true" />
      <div className="intro-premium-blob intro-premium-blob-a" aria-hidden="true" />
      <div className="intro-premium-blob intro-premium-blob-b" aria-hidden="true" />
      <div className="intro-premium-stage">
        <header className="intro-premium-top">
          <div>
            <p className="intro-premium-kicker">University Resource Share</p>
            <h1>Study resources built for real semester pressure.</h1>
          </div>
          <Link to="/auth" className="intro-premium-link">Login / Register</Link>
        </header>

        <div className="intro-premium-hero">
          <div className="intro-premium-left">
            <p className="intro-premium-copy">
              Upload strong notes, open PYQs instantly, and use AI planning to track your target grade with realistic weekly execution.
            </p>
            <div className="intro-premium-pill-row">
              {valuePills.map((item) => (
                <span key={item} className="intro-premium-pill">{item}</span>
              ))}
            </div>
            <div className="intro-premium-actions">
              <Link to="/auth" className="intro-premium-btn">Get Started</Link>
            </div>
            <div className="intro-premium-wave" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>

          <aside className="intro-premium-right">
            <div className="intro-premium-visual">
              <img src="/intro-campus.svg" alt="Students collaborating with study resources" />
            </div>
            <div className="intro-premium-metric">
              <strong>87%</strong>
              <span>students improved exam prep consistency after weekly planner usage</span>
            </div>
            <div className="intro-premium-metric">
              <strong>24/7</strong>
              <span>instant access to notes, PYQs, and quick research summaries</span>
            </div>
            <div className="intro-premium-metric">
              <strong>All-in-1</strong>
              <span>search, upload, profile insights, AI copilot, and grade planner</span>
            </div>
          </aside>
        </div>

        <div className="intro-premium-feature-grid">
          {featureCards.map((card) => (
            <article key={card.title} className="intro-premium-feature-card">
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>

        <div className="intro-premium-lower-grid">
          <section className="intro-premium-flow">
            <h3>How students use this platform</h3>
            <div className="intro-premium-step-grid">
              {flowSteps.map((step) => (
                <article key={step.title} className="intro-premium-step-card">
                  <strong>{step.title}</strong>
                  <p>{step.text}</p>
                </article>
              ))}
            </div>
          </section>

          <aside className="intro-premium-quote">
            <p>
              "Before exams, I open PYQs here, follow my AI roadmap, and revise with one clean flow."
            </p>
            <span>Student Feedback - Semester 5</span>
          </aside>
        </div>

        <div className="intro-premium-ticker-wrap" aria-hidden="true">
          <div className="intro-premium-ticker-track">
            {[...tickerItems, ...tickerItems].map((item, idx) => (
              <span key={`${item}-${idx}`} className="intro-premium-ticker-item">{item}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
