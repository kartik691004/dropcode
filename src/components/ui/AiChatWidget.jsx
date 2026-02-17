import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function buildBotReply(message, pathname) {
  const text = String(message || "").toLowerCase();
  const isUpload = pathname.includes("upload");
  const isSearch = pathname.includes("search");
  const isProfile = pathname.includes("profile");
  const isDashboard = pathname.includes("dashboard");

  if (text.includes("upload")) {
    return "Upload flow: choose subject, add a clear title, add short description, then upload notes/PYQ/research file. Keep filename simple and use PDF/TXT for best compatibility.";
  }
  if (text.includes("search") || text.includes("find")) {
    return "Search tip: use subject keywords like 'DBMS PYQ' or 'OS notes'. You can also click the subject cards and open Notes/PYQ/Research directly.";
  }
  if (text.includes("grade") || text.includes("sgpa") || text.includes("study plan")) {
    return "For target grade planning, set your target grade, current SGPA, weekly hours, consistency, and weeks to exam. Then follow the weekly roadmap and interventions section.";
  }
  if (text.includes("attendance")) {
    return "Keep attendance above 75% to reduce academic risk. If attendance is low, schedule weekly catch-up notes and one weekend recovery session.";
  }
  if (text.includes("resource") || text.includes("notes") || text.includes("pyq")) {
    return "High-quality notes are concise, topic-tagged, and include solved PYQs. Add unit labels and repeated exam questions for better peer usefulness.";
  }
  if (text.includes("hello") || text.includes("hi") || text.includes("help")) {
    return "I can help with uploads, search filters, grade target planning, attendance strategy, and weekly study routines. Ask me in plain language.";
  }

  if (isUpload) {
    return "You are on Upload page. I can help you format title, tags, and file quality before submit.";
  }
  if (isSearch) {
    return "You are on Search page. Try subject-first queries and open the per-subject Notes/PYQ/Research files.";
  }
  if (isProfile) {
    return "You are on Profile page. Use AI Grade Target Planner controls to generate personalized study roadmap.";
  }
  if (isDashboard) {
    return "You are on Dashboard. I can suggest next 3 priority actions based on your target grade and pending subjects.";
  }
  return "Try asking: 'How do I improve from B to A?', 'What to upload for DBMS?', or 'How to plan 10 hours/week before exam?'.";
}

const quickPrompts = [
  "Plan for A grade in 8 weeks",
  "How to upload better notes?",
  "How to search PYQ quickly?",
  "Improve attendance + SGPA",
];

export default function AiChatWidget() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "AI Study Assistant is ready. Ask anything about using this app, study plans, target grades, or uploads.",
    },
  ]);

  const pageLabel = useMemo(() => {
    if (location.pathname.includes("dashboard")) return "Dashboard";
    if (location.pathname.includes("upload")) return "Upload";
    if (location.pathname.includes("search")) return "Search";
    if (location.pathname.includes("profile")) return "Profile";
    return "App";
  }, [location.pathname]);

  function sendMessage(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return;
    const reply = buildBotReply(trimmed, location.pathname);
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: reply },
    ]);
    setValue("");
  }

  return (
    <div className="chatbot-shell">
      {open && (
        <div className="chatbot-panel card">
          <div className="chatbot-head">
            <div>
              <strong>AI Study Assistant</strong>
              <div className="muted" style={{ fontSize: "0.8rem" }}>Context: {pageLabel}</div>
            </div>
            <button type="button" className="ghost" onClick={() => setOpen(false)}>Close</button>
          </div>

          <div className="chatbot-log">
            {messages.map((msg, index) => (
              <div key={`${msg.role}-${index}`} className={`chatbot-msg chatbot-${msg.role}`}>
                {msg.content}
              </div>
            ))}
          </div>

          <div className="chatbot-prompt-row">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" className="quick-chip" onClick={() => sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="chatbot-input-row">
            <input
              value={value}
              placeholder="Ask study/app question..."
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  sendMessage(value);
                }
              }}
            />
            <button type="button" onClick={() => sendMessage(value)}>Send</button>
          </div>

          <div className="chatbot-actions">
            <button type="button" className="ghost" onClick={() => navigate("/dashboard")}>Go Dashboard</button>
            <button type="button" className="ghost" onClick={() => navigate("/upload")}>Go Upload</button>
            <button type="button" className="ghost" onClick={() => navigate("/search")}>Go Search</button>
            <button type="button" className="ghost" onClick={() => navigate("/profile")}>Go Profile</button>
          </div>
        </div>
      )}
      <button type="button" className="chatbot-fab" onClick={() => setOpen((v) => !v)}>
        {open ? "Hide AI" : "Ask AI"}
      </button>
    </div>
  );
}
