import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ResourceCard from "../components/ui/ResourceCard";
import { apiRequest } from "../lib/api";

const initialQuickForm = {
  title: "",
  subject: "",
  semester: "",
  type: "notes",
  branch: "",
  year: "",
  description: "",
  privacyLevel: "public",
  tags: "",
};

const subjectHighlights = [
  {
    name: "Data Structures",
    note: "Greedy, graph, and dynamic programming revision bundle for Sem 3.",
  },
  {
    name: "DBMS",
    note: "Normalization, SQL joins, indexing, and transaction notes with examples.",
  },
  {
    name: "Operating Systems",
    note: "CPU scheduling, deadlocks, and memory management quick sheets.",
  },
];

const campusAnnouncements = [
  { tag: "Urgent", text: "PYQ drive closes Sunday, 9:00 PM." },
  { tag: "Exam", text: "CSE prep sprint starts Friday in Lab-2." },
  { tag: "Session", text: "OS + CN revision circle today, 6:30 PM." },
  { tag: "Upload", text: "Minimum 4 tags required for featured listing." },
];

const featuredNotes = [
  "CN Unit-4 solved numericals (short format)",
  "Java OOP viva one-liners (rapid revision)",
  "ML model comparison chart (exam-focused)",
  "DBMS transactions cheat sheet (last-night prep)",
];

const aiCopilotPrompts = [
  "Generate unit-wise revision path for DBMS in 4 days",
  "Create 20 likely viva questions from OS memory unit",
  "Summarize CN routing algorithms in bullet form",
  "Prepare last-night revision checklist for DSA",
];

const aiGeneratedNotes = [
  {
    title: "AI Revision Note: DBMS Unit 3",
    detail: "Normalization steps, lossless decomposition checks, and 8 high-probability questions.",
  },
  {
    title: "AI Sprint: Operating Systems",
    detail: "Round Robin vs SJF recap + deadlock prevention memory map.",
  },
  {
    title: "AI Mock Viva Pack: Computer Networks",
    detail: "35 fast Q&A prompts covering TCP, congestion, and subnetting.",
  },
];

const copilotPromptLibrary = [
  {
    id: "revision-sprint",
    label: "4-Day Revision Sprint",
    objective: "Build a fast, high-yield revision schedule for exams.",
    prompt: "Act as a strict academic coach. Build a 4-day revision sprint with hourly blocks, active recall tasks, and end-of-day tests for: {{subjects}}. Student profile: semester {{semester}}, target grade {{grade}}, weekly hours {{hours}}. Include fallback plan if a day is missed.",
  },
  {
    id: "pyq-master",
    label: "PYQ Master Plan",
    objective: "Solve previous-year questions with answer-writing strategy.",
    prompt: "Create a previous-year-question strategy for {{subjects}}. Give a 7-day plan with: question selection, expected marks weight, answer structure, common mistakes, and a scoring rubric out of 10 per answer.",
  },
  {
    id: "viva-ready",
    label: "Viva Prep Mode",
    objective: "Prepare short and confident viva answers.",
    prompt: "Generate a viva prep kit for {{subjects}}: 25 rapid-fire questions, ideal 30-second answers, trap questions, and confidence drills. Keep responses concise and student-friendly.",
  },
  {
    id: "deep-understanding",
    label: "Concept Clarity",
    objective: "Fix weak conceptual understanding quickly.",
    prompt: "Identify likely weak concepts in {{subjects}} for semester {{semester}} and explain each with simple analogy + exam-style definition + one solved mini-example + one common misconception.",
  },
];

const copilotSubjectOptions = [
  "Auto from resources",
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

const momentumChecklist = [
  "2 PYQ sets solved this week",
  "1 new summary note uploaded",
  "Daily 45-min revision streak active",
];

const quickUploadTemplates = [
  { label: "Notes", type: "notes", tags: "notes,revision,unit-wise" },
  { label: "PYQ", type: "pyq", tags: "pyq,previous-year,practice" },
  { label: "Research", type: "research", tags: "research,paper,summary" },
];

function targetBandFromGrade(grade) {
  if (grade === "A+") return 9.0;
  if (grade === "A") return 8.0;
  if (grade === "B") return 7.0;
  return 6.0;
}

const semesterBenchmarks = {
  "Semester 1": [
    { year: 2021, avgSgpa: 6.9, passRate: 78 },
    { year: 2022, avgSgpa: 7.1, passRate: 81 },
    { year: 2023, avgSgpa: 7.2, passRate: 84 },
    { year: 2024, avgSgpa: 7.4, passRate: 86 },
    { year: 2025, avgSgpa: 7.5, passRate: 88 },
  ],
  "Semester 2": [
    { year: 2021, avgSgpa: 6.8, passRate: 76 },
    { year: 2022, avgSgpa: 7.0, passRate: 79 },
    { year: 2023, avgSgpa: 7.2, passRate: 83 },
    { year: 2024, avgSgpa: 7.3, passRate: 85 },
    { year: 2025, avgSgpa: 7.6, passRate: 87 },
  ],
  "Semester 3": [
    { year: 2021, avgSgpa: 6.7, passRate: 74 },
    { year: 2022, avgSgpa: 6.9, passRate: 77 },
    { year: 2023, avgSgpa: 7.1, passRate: 82 },
    { year: 2024, avgSgpa: 7.2, passRate: 84 },
    { year: 2025, avgSgpa: 7.4, passRate: 86 },
  ],
  "Semester 4": [
    { year: 2021, avgSgpa: 6.9, passRate: 79 },
    { year: 2022, avgSgpa: 7.0, passRate: 80 },
    { year: 2023, avgSgpa: 7.3, passRate: 84 },
    { year: 2024, avgSgpa: 7.5, passRate: 87 },
    { year: 2025, avgSgpa: 7.7, passRate: 89 },
  ],
};

function mapApiResourceToCard(item) {
  return {
    id: item.id,
    title: item.title,
    subject: item.subject,
    semester: item.semester,
    type: item.type,
    branch: item.branch,
    privacy: item.privacy_level || "public",
    avgRating: Number(item.avg_rating || 0),
    ratingsCount: Number(item.ratings_count || 0),
    description: item.description || "",
  };
}

export default function DashboardPage() {
  const [topResources, setTopResources] = useState([]);
  const [recentUploads, setRecentUploads] = useState([]);
  const [quickForm, setQuickForm] = useState(initialQuickForm);
  const [quickFile, setQuickFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingDuplicate, setPendingDuplicate] = useState(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("Semester 4");
  const [currentTargetSgpa, setCurrentTargetSgpa] = useState("");
  const [currentSgpa, setCurrentSgpa] = useState("7.4");
  const [attendance, setAttendance] = useState("86");
  const [targetGrade, setTargetGrade] = useState("A");
  const [priorityType, setPriorityType] = useState("all");
  const [priorityMinRating, setPriorityMinRating] = useState("0");
  const [priorityQuery, setPriorityQuery] = useState("");
  const [priorityView, setPriorityView] = useState("grid");
  const [quickSuggestedTags, setQuickSuggestedTags] = useState([]);
  const [quickPreGrade, setQuickPreGrade] = useState(null);
  const [quickChecking, setQuickChecking] = useState(false);
  const [copilotMode, setCopilotMode] = useState("revision-sprint");
  const [copilotGoal, setCopilotGoal] = useState("Prepare smartly and reach target grade without burnout");
  const [copilotSubject, setCopilotSubject] = useState("Auto from resources");
  const [copilotStatus, setCopilotStatus] = useState("");

  const parsedTags = useMemo(
    () =>
      String(quickForm.tags || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    [quickForm.tags]
  );

  const quickStats = useMemo(() => {
    const total = topResources.length;
    const avgRating = total
      ? (topResources.reduce((sum, item) => sum + Number(item.avgRating || 0), 0) / total).toFixed(1)
      : "0.0";
    const privateCount = recentUploads.filter((item) => item.privacy_level === "private").length;
    return [
      { label: "Top Picks", value: total || "6+" },
      { label: "Avg Rating", value: avgRating },
      { label: "My Uploads", value: recentUploads.length },
      { label: "Private Docs", value: privateCount },
    ];
  }, [topResources, recentUploads]);

  const uploadHealth = useMemo(() => {
    if (quickPreGrade?.score) {
      const realScore = Number(quickPreGrade.score);
      const grade = realScore >= 85 ? "Excellent" : realScore >= 70 ? "Good" : realScore >= 55 ? "Average" : "Needs Work";
      return { total: realScore, grade, source: "ai" };
    }

    const titleLen = quickForm.title.trim().length;
    const descriptionLen = quickForm.description.trim().length;
    const hasFile = !!quickFile;
    const hasCoreFields = !!(quickForm.subject && quickForm.semester && quickForm.year);
    const subjectTagMatch = parsedTags.some((tag) =>
      String(quickForm.subject || "").toLowerCase().includes(String(tag).toLowerCase()) ||
      String(tag).toLowerCase().includes(String(quickForm.subject || "").toLowerCase())
    );
    const ratingLikeScore =
      (hasFile ? 20 : 0) +
      (titleLen >= 10 ? 16 : titleLen >= 6 ? 10 : 4) +
      (descriptionLen >= 120 ? 20 : descriptionLen >= 50 ? 12 : 5) +
      (parsedTags.length >= 5 ? 20 : parsedTags.length >= 3 ? 14 : parsedTags.length > 0 ? 8 : 2) +
      (hasCoreFields ? 14 : 5) +
      (subjectTagMatch ? 10 : 4);
    const total = Math.max(0, Math.min(100, Math.round(ratingLikeScore)));
    const grade = total >= 80 ? "Excellent" : total >= 65 ? "Good" : total >= 50 ? "Average" : "Needs Work";
    return { total, grade, source: "heuristic" };
  }, [quickForm, parsedTags, quickPreGrade, quickFile]);

  const selectedSemesterRows = useMemo(
    () => semesterBenchmarks[selectedSemester] || [],
    [selectedSemester]
  );

  const historicalAvg = useMemo(() => {
    if (!selectedSemesterRows.length) return 0;
    return selectedSemesterRows.reduce((sum, item) => sum + item.avgSgpa, 0) / selectedSemesterRows.length;
  }, [selectedSemesterRows]);

  const targetDelta = useMemo(() => {
    const target = Number(currentTargetSgpa);
    if (!Number.isFinite(target) || !target) return null;
    return Number((target - historicalAvg).toFixed(2));
  }, [currentTargetSgpa, historicalAvg]);

  const snapshotModel = useMemo(() => {
    const gradeBand = targetBandFromGrade(targetGrade);
    const typedTarget = Number(currentTargetSgpa || 0);
    const target = typedTarget || gradeBand;
    const current = Number(currentSgpa || 0);
    const attendanceValue = Number(attendance || 0);
    const improvement = Number((current - historicalAvg).toFixed(2));
    const targetGap = target ? Number((target - current).toFixed(2)) : null;
    const prepScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (current / 10) * 45 +
          (attendanceValue / 100) * 30 +
          (topResources.length ? 15 : 8) +
          (recentUploads.length ? 10 : 4)
        )
      )
    );

    return {
      current,
      target,
      gradeBand,
      attendanceValue,
      improvement,
      targetGap,
      prepScore,
      trend: improvement >= 0 ? "up" : "down",
    };
  }, [currentTargetSgpa, currentSgpa, attendance, targetGrade, historicalAvg, topResources.length, recentUploads.length]);

  const snapshotGuidance = useMemo(() => {
    const items = [];
    if (snapshotModel.attendanceValue < 75) {
      items.push("Attendance is below 75%. Prioritize class presence to avoid internal risk.");
    } else if (snapshotModel.attendanceValue < 85) {
      items.push("Attendance is moderate. Push it to 85%+ for safer semester standing.");
    } else {
      items.push("Attendance is strong. Maintain this consistency.");
    }

    if (snapshotModel.targetGap !== null) {
      if (snapshotModel.targetGap > 0.8) {
        items.push("Target gap is high. Increase weekly study volume and timed mocks.");
      } else if (snapshotModel.targetGap > 0) {
        items.push("Target gap is manageable. Focus on PYQ solving and weak units.");
      } else {
        items.push("You are on or above target trend. Keep revision quality high.");
      }
    } else {
      items.push("Set a target SGPA to get personalized gap analysis.");
    }

    if (snapshotModel.prepScore < 70) {
      items.push("Prep score suggests inconsistency. Use 40-35-25 split (concepts-PYQ-revision).");
    } else {
      items.push("Prep score is healthy. Continue weekly mock + analysis cycle.");
    }
    return items;
  }, [snapshotModel]);

  const copilotSubjects = useMemo(() => {
    const fromResources = topResources.slice(0, 4).map((item) => item.subject).filter(Boolean);
    return fromResources.length ? Array.from(new Set(fromResources)).join(", ") : "DBMS, Operating Systems, Computer Networks";
  }, [topResources]);

  const resolvedCopilotSubjects = useMemo(
    () => (copilotSubject === "Auto from resources" ? copilotSubjects : copilotSubject),
    [copilotSubject, copilotSubjects]
  );

  const activeCopilotPrompt = useMemo(
    () => copilotPromptLibrary.find((item) => item.id === copilotMode) || copilotPromptLibrary[0],
    [copilotMode]
  );

  const composedCopilotPrompt = useMemo(() => {
    const template = activeCopilotPrompt.prompt;
    return template
      .replaceAll("{{subjects}}", resolvedCopilotSubjects)
      .replaceAll("{{semester}}", selectedSemester.replace("Semester ", ""))
      .replaceAll("{{grade}}", targetGrade)
      .replaceAll("{{hours}}", "12")
      .concat(`\n\nExtra student goal: ${copilotGoal}`);
  }, [activeCopilotPrompt, resolvedCopilotSubjects, selectedSemester, targetGrade, copilotGoal]);

  const priorityMeta = useMemo(() => {
    const byType = topResources.reduce((acc, item) => {
      const key = String(item.type || "others").toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return byType;
  }, [topResources]);

  const filteredPriorityResources = useMemo(() => {
    return topResources.filter((item) => {
      if (priorityType !== "all" && String(item.type || "").toLowerCase() !== priorityType) return false;
      if (Number(item.avgRating || 0) < Number(priorityMinRating || 0)) return false;
      if (priorityQuery.trim()) {
        const hay = `${item.title} ${item.subject} ${item.branch} ${item.type}`.toLowerCase();
        if (!hay.includes(priorityQuery.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [topResources, priorityType, priorityMinRating, priorityQuery]);

  function setField(key, value) {
    setQuickForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      const [search, mine] = await Promise.all([
        apiRequest("/api/resources/search?sort=priority&page=1&limit=6"),
        apiRequest("/api/resources/mine"),
      ]);
      setTopResources((search.resources || []).map(mapApiResourceToCard));
      setRecentUploads(mine.resources || []);
    } catch (err) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  async function quickUpload(confirmDuplicate = false) {
    try {
      setError("");
      setStatus("");
      setUploading(true);
      if (!quickFile) {
        setError("Select a file to upload.");
        return;
      }

      const fd = new FormData();
      fd.append("file", quickFile);
      fd.append("title", quickForm.title);
      fd.append("subject", quickForm.subject);
      fd.append("semester", quickForm.semester);
      fd.append("type", quickForm.type);
      fd.append("branch", quickForm.branch);
      fd.append("year", quickForm.year);
      fd.append("description", quickForm.description);
      fd.append("privacyLevel", quickForm.privacyLevel);
      fd.append("tags", parsedTags.join(","));
      if (confirmDuplicate) fd.append("confirmDuplicate", "true");

      const res = await apiRequest("/api/resources/upload", { method: "POST", body: fd });
      setStatus(`Quick upload completed (Resource #${res.resource.id}).`);
      setPendingDuplicate(null);
      setQuickSuggestedTags([]);
      setQuickPreGrade(null);
      setQuickForm(initialQuickForm);
      setQuickFile(null);
      await loadDashboard();
    } catch (err) {
      if (err?.status === 409 && err?.data?.requiresConfirmation) {
        setPendingDuplicate(err.data);
        setError("Possible duplicate detected. Review similar resources before final upload.");
      } else {
        setError(err.message || "Quick upload failed");
      }
    } finally {
      setUploading(false);
    }
  }

  async function analyzeQuickUpload() {
    try {
      setError("");
      setStatus("");
      setQuickChecking(true);
      if (!quickForm.title.trim()) {
        setError("Enter title first for quick analysis.");
        return;
      }
      const fd = new FormData();
      fd.append("title", quickForm.title);
      fd.append("subject", quickForm.subject || "");
      if (quickFile) fd.append("file", quickFile);
      const res = await apiRequest("/api/resources/suggest-tags", { method: "POST", body: fd });
      setQuickSuggestedTags(res.suggestedTags || []);
      if (!quickForm.tags && (res.suggestedTags || []).length) {
        setQuickForm((prev) => ({ ...prev, tags: (res.suggestedTags || []).join(",") }));
      }
      setQuickPreGrade(res.preGrade || null);
      setStatus("Quick analysis completed. Review AI tags/grade before upload.");
    } catch (err) {
      setError(err.message || "Quick analysis failed");
    } finally {
      setQuickChecking(false);
    }
  }

  async function openCopilotInChatGPT() {
    setCopilotStatus("");
    const chatgptUrl = "https://chatgpt.com/";
    const opened = window.open(chatgptUrl, "_blank", "noopener,noreferrer");
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(composedCopilotPrompt);
      }
      setCopilotStatus(opened ? "Prompt copied. ChatGPT opened in a new tab. Paste (Ctrl+V) there." : "Popup blocked. Allow popups for this site, then try again.");
    } catch (_err) {
      setCopilotStatus(opened ? "ChatGPT opened in a new tab. Copy the prompt manually from below and paste there." : "Popup blocked. Allow popups for this site, then try again.");
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <section>
      <div className="page-head">
        <h2 className="page-title">Dashboard</h2>
        <p className="page-subtitle">Track your study resources, upload smarter, and discover what your classmates are using.</p>
      </div>

      <div className="hero-grid">
        <div className="card card-light snapshot-card">
          <h3 style={{ marginTop: 0 }}>Semester Progress Snapshot</h3>
          <p className="muted">Richer progress intelligence using SGPA, attendance, resources, and upload momentum.</p>
          <div className="result-compare-grid">
            <div>
              <label htmlFor="snapshot-grade-target">Target Grade</label>
              <select
                id="snapshot-grade-target"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                style={{ marginTop: "0.35rem" }}
              >
                <option value="A+">A+</option>
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </div>
            <div>
              <label htmlFor="snapshot-current">Current SGPA</label>
              <input
                id="snapshot-current"
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={currentSgpa}
                onChange={(e) => setCurrentSgpa(e.target.value)}
                style={{ marginTop: "0.35rem" }}
              />
            </div>
            <div>
              <label htmlFor="snapshot-attendance">Attendance %</label>
              <input
                id="snapshot-attendance"
                type="number"
                min="0"
                max="100"
                step="1"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                style={{ marginTop: "0.35rem" }}
              />
            </div>
          </div>
          <div className="snapshot-metric-grid">
            <div className="snapshot-metric">
              <span className="muted">Current vs Historical</span>
              <strong>{snapshotModel.current.toFixed(2)}</strong>
              <small className={snapshotModel.trend === "up" ? "trend-good" : "trend-low"}>
                {snapshotModel.trend === "up" ? "+" : ""}{snapshotModel.improvement}
              </small>
            </div>
            <div className="snapshot-metric">
              <span className="muted">Target Gap</span>
              <strong>
                {snapshotModel.targetGap === null ? "Set target" : (snapshotModel.targetGap > 0 ? `+${snapshotModel.targetGap}` : snapshotModel.targetGap)}
              </strong>
              <small>Grade {targetGrade} | SGPA {snapshotModel.target.toFixed(1)}</small>
            </div>
            <div className="snapshot-metric">
              <span className="muted">Prep Score</span>
              <strong>{snapshotModel.prepScore}%</strong>
              <small>{snapshotModel.prepScore >= 75 ? "Exam-ready trend" : "Needs tighter routine"}</small>
            </div>
          </div>
          <div style={{ marginTop: "0.65rem" }}>
            <div className="inline-row" style={{ justifyContent: "space-between", marginTop: 0 }}>
              <span className="muted">Semester Readiness</span>
              <strong>{snapshotModel.prepScore}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${snapshotModel.prepScore}%` }} />
            </div>
          </div>
          <h4 style={{ marginBottom: "0.35rem" }}>Study Momentum</h4>
          <ul className="notes-list">
            {momentumChecklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <h4 style={{ marginBottom: "0.35rem" }}>AI Snapshot Guidance</h4>
          <ul className="notes-list">
            {snapshotGuidance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="stat-grid">
            {quickStats.map((item) => (
              <div className="stat-card" key={item.label}>
                <span className="stat-number">{item.value}</span>
                <span className="stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Subject Spotlights</h3>
          <div className="subject-grid">
            {subjectHighlights.map((item) => (
              <div className="subject-card" key={item.name}>
                <h4>{item.name}</h4>
                <p>{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card glass-card section-row">
        <div className="ai-header">
          <h3 style={{ margin: 0 }}>Generative AI Study Co-Pilot (Advanced)</h3>
          <span className="ai-badge"><span className="pulse-dot" />Live Suggestions</span>
        </div>
        <p className="muted">Interactive co-pilot with ChatGPT handoff, personalized prompts, and study-mode playbooks.</p>
        <div className="result-compare-grid">
          <div>
            <label htmlFor="copilot-mode">Study Mode</label>
            <select id="copilot-mode" value={copilotMode} onChange={(e) => setCopilotMode(e.target.value)} style={{ marginTop: "0.35rem" }}>
              {copilotPromptLibrary.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="copilot-subject">Subject</label>
            <select id="copilot-subject" value={copilotSubject} onChange={(e) => setCopilotSubject(e.target.value)} style={{ marginTop: "0.35rem" }}>
              {copilotSubjectOptions.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="copilot-goal">Your Goal</label>
            <input
              id="copilot-goal"
              value={copilotGoal}
              onChange={(e) => setCopilotGoal(e.target.value)}
              placeholder="e.g. Finish revision with confidence in 2 weeks"
              style={{ marginTop: "0.35rem" }}
            />
          </div>
        </div>
        <div className="card" style={{ marginTop: "0.7rem" }}>
          <strong>{activeCopilotPrompt.label}</strong>
          <p className="muted" style={{ marginTop: "0.3rem" }}>{activeCopilotPrompt.objective}</p>
          <div className="inline-row">
            <button type="button" onClick={openCopilotInChatGPT}>Copy + Open ChatGPT</button>
            <button
              type="button"
              className="ghost"
              onClick={async () => {
                try {
                  if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(composedCopilotPrompt);
                  setCopilotStatus("Prompt copied. You can use it anywhere.");
                } catch (_err) {
                  setCopilotStatus("Copy failed on this browser. Select and copy manually.");
                }
              }}
            >
              Copy Prompt
            </button>
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="btn-link">Open ChatGPT</a>
            <a href="https://chatgpt.com/" target="_blank" rel="noreferrer" className="btn-link">Open in New Tab</a>
          </div>
          {copilotStatus && <p className="muted" style={{ marginTop: "0.45rem" }}>{copilotStatus}</p>}
          <textarea readOnly rows="6" value={composedCopilotPrompt} style={{ marginTop: "0.5rem" }} />
        </div>
        <div className="ai-grid">
          {aiGeneratedNotes.map((item) => (
            <div className="ai-note-card" key={item.title}>
              <h4>{item.title}</h4>
              <p>{item.detail}</p>
            </div>
          ))}
        </div>
        <h4 style={{ marginBottom: "0.45rem" }}>Instant Prompt Ideas</h4>
        <ul className="notes-list">
          {aiCopilotPrompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      </div>

      <div className="card section-row">
        <h3 style={{ marginTop: 0 }}>Semester Result Comparator</h3>
        <p className="muted">Compare previous years results with your current target SGPA.</p>
        <div className="result-compare-grid">
          <div>
            <label htmlFor="semester-compare">Semester</label>
            <select
              id="semester-compare"
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value)}
              style={{ marginTop: "0.35rem" }}
            >
              {Object.keys(semesterBenchmarks).map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="target-sgpa">Your Current Target SGPA</label>
            <input
              id="target-sgpa"
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="e.g. 8.2"
              value={currentTargetSgpa}
              onChange={(e) => setCurrentTargetSgpa(e.target.value)}
              style={{ marginTop: "0.35rem" }}
            />
          </div>
        </div>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Average SGPA</th>
                <th>Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {selectedSemesterRows.map((row) => (
                <tr key={row.year}>
                  <td>{row.year}</td>
                  <td>{row.avgSgpa}</td>
                  <td>{row.passRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">
          Previous years average SGPA: <strong>{historicalAvg.toFixed(2)}</strong>
          {targetDelta !== null && (
            <> | Your target is <strong className={targetDelta >= 0 ? "trend-good" : "trend-low"}>{targetDelta >= 0 ? `+${targetDelta}` : targetDelta}</strong> from the historical average.</>
          )}
        </p>
      </div>

      <div className="card section-row">
        <h3 style={{ marginTop: 0 }}>Priority Resources</h3>
        <p className="muted">Top-ranked resources based on quality, engagement, and relevance. Use filters to quickly find the best notes.</p>
        <div className="priority-toolbar">
          <input
            placeholder="Filter by keyword (DBMS, PYQ, CN...)"
            value={priorityQuery}
            onChange={(e) => setPriorityQuery(e.target.value)}
          />
          <select value={priorityType} onChange={(e) => setPriorityType(e.target.value)}>
            <option value="all">All Types</option>
            <option value="notes">Notes</option>
            <option value="pyq">PYQ</option>
            <option value="research">Research</option>
            <option value="ppt">PPT</option>
          </select>
          <select value={priorityMinRating} onChange={(e) => setPriorityMinRating(e.target.value)}>
            <option value="0">Rating: Any</option>
            <option value="3">Rating: 3.0+</option>
            <option value="3.5">Rating: 3.5+</option>
            <option value="4">Rating: 4.0+</option>
            <option value="4.5">Rating: 4.5+</option>
          </select>
          <select value={priorityView} onChange={(e) => setPriorityView(e.target.value)}>
            <option value="grid">Grid View</option>
            <option value="compact">Compact View</option>
          </select>
        </div>
        <div className="priority-pills">
          <span className="quick-chip">Total: {topResources.length}</span>
          <span className="quick-chip">Notes: {priorityMeta.notes || 0}</span>
          <span className="quick-chip">PYQ: {priorityMeta.pyq || 0}</span>
          <span className="quick-chip">Research: {priorityMeta.research || 0}</span>
          <span className="quick-chip">Showing: {filteredPriorityResources.length}</span>
        </div>
        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            {filteredPriorityResources.length ? (
              priorityView === "grid" ? (
                <div className="card-grid">
                  {filteredPriorityResources.map((item) => <ResourceCard key={item.id} resource={item} />)}
                </div>
              ) : (
                <div className="priority-list">
                  {filteredPriorityResources.map((item) => (
                    <div className="priority-row" key={item.id}>
                      <div>
                        <strong>{item.title}</strong>
                        <div className="muted" style={{ fontSize: "0.9rem" }}>
                          {item.subject} | Sem {item.semester} | {item.type} | {item.branch}
                        </div>
                        <div className="muted" style={{ fontSize: "0.86rem" }}>
                          Rating: {Number(item.avgRating || 0).toFixed(1)} ({item.ratingsCount || 0} reviews)
                        </div>
                      </div>
                      <Link to={`/resources/${item.id}`} className="btn-link">Open</Link>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="muted">No resources match these filters. Reduce rating/type filters or clear keyword.</p>
            )}
          </>
        )}
      </div>

      <div className="card section-row">
        <h3 style={{ marginTop: 0 }}>Quick Upload (Duplicate-Aware)</h3>
        <p className="muted">Student-friendly flow: use template, analyze quality, then upload. Duplicate warnings appear before final save.</p>
        <div className="quick-chip-row" style={{ marginBottom: "0.45rem" }}>
          {quickUploadTemplates.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              className="quick-chip"
              onClick={() => {
                setQuickForm((prev) => ({ ...prev, type: tpl.type, tags: tpl.tags }));
                setStatus(`${tpl.label} template applied.`);
              }}
            >
              {tpl.label} Template
            </button>
          ))}
        </div>
        <div className="ai-mini-stat">
          <div className="ai-mini-box">
            <span className="muted">AI Upload Quality</span>
            <strong>{uploadHealth.total}%</strong>
          </div>
          <div className="ai-mini-box">
            <span className="muted">Readiness Grade</span>
            <strong>{uploadHealth.grade}</strong>
          </div>
          <div className="ai-mini-box">
            <span className="muted">Detected Tags</span>
            <strong>{parsedTags.length}</strong>
          </div>
          <div className="ai-mini-box">
            <span className="muted">Quality Source</span>
            <strong>{uploadHealth.source === "ai" ? "AI Analysis" : "Metadata Estimate"}</strong>
          </div>
        </div>
        <form
          className="form two-col"
          onSubmit={(e) => {
            e.preventDefault();
            quickUpload(false);
          }}
        >
          <input placeholder="Title" value={quickForm.title} onChange={(e) => setField("title", e.target.value)} required />
          <input placeholder="Subject" value={quickForm.subject} onChange={(e) => setField("subject", e.target.value)} required />
          <input placeholder="Semester" value={quickForm.semester} onChange={(e) => setField("semester", e.target.value)} required />
          <input placeholder="Type" value={quickForm.type} onChange={(e) => setField("type", e.target.value)} required />
          <input placeholder="Branch" value={quickForm.branch} onChange={(e) => setField("branch", e.target.value)} required />
          <input placeholder="Year" value={quickForm.year} onChange={(e) => setField("year", e.target.value)} required />
          <div className="col-span file-dropzone">
            <p style={{ margin: "0 0 0.35rem" }}>
              {quickFile ? `Selected: ${quickFile.name}` : "No file selected yet"}
            </p>
            <input type="file" onChange={(e) => setQuickFile(e.target.files?.[0] || null)} required />
          </div>
          <input placeholder="Tags (comma-separated)" className="col-span" value={quickForm.tags} onChange={(e) => setField("tags", e.target.value)} />
          {!!quickSuggestedTags.length && (
            <div className="col-span tag-wrap">
              {quickSuggestedTags.map((t) => (
                <span className="tag-chip" key={t}>{t}</span>
              ))}
            </div>
          )}
          <textarea placeholder="Description" className="col-span" rows="3" value={quickForm.description} onChange={(e) => setField("description", e.target.value)} />
          <select value={quickForm.privacyLevel} onChange={(e) => setField("privacyLevel", e.target.value)}>
            <option value="public">public</option>
            <option value="private">private</option>
          </select>
          <div className="inline-row">
            <button type="button" className="ghost" onClick={analyzeQuickUpload} disabled={quickChecking}>
              {quickChecking ? "Analyzing..." : "Analyze First"}
            </button>
            <button type="submit" disabled={uploading}>
              {uploading ? "Uploading..." : "Quick Upload"}
            </button>
          </div>
        </form>

        {quickPreGrade && (
          <div className="card grade-box" style={{ marginTop: "0.75rem" }}>
            <div className="inline-row" style={{ justifyContent: "space-between", marginTop: 0 }}>
              <strong>AI Pre-Grade</strong>
              <span className={`grade-pill grade-${String(quickPreGrade.grade || "d").toLowerCase()}`}>
                {quickPreGrade.grade} ({quickPreGrade.score}/100)
              </span>
            </div>
            <p className="muted" style={{ margin: "0.3rem 0 0" }}>{quickPreGrade.verdict}</p>
          </div>
        )}

        {status && <p style={{ color: "#1f7a3b" }}>{status}</p>}
        {error && <p style={{ color: "#a62222" }}>{error}</p>}

        {pendingDuplicate && (
          <div className="card duplicate-box" style={{ marginTop: "0.8rem" }}>
            <h4>Similar Resources Found</h4>
            <p className="muted">Open similar files first. If yours is still different, continue with Upload Anyway.</p>
            <ul>
              {(pendingDuplicate.similarResources || []).map((r) => (
                <li key={r.id}>
                  <a href={`http://localhost:3000${r.resource_url}`} target="_blank" rel="noreferrer">
                    {r.title}
                  </a>{" "}
                  (score: {r.similarityScore})
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => quickUpload(true)} disabled={uploading}>
              {uploading ? "Uploading..." : "Upload Anyway"}
            </button>
          </div>
        )}
      </div>

      <div className="card section-row">
        <h3 style={{ marginTop: 0 }}>Campus Feed</h3>
        <div className="bullet-feed">
          {campusAnnouncements.map((item) => (
            <div className="announcement-item" key={`${item.tag}-${item.text}`}>
              <span className="feed-tag">{item.tag}</span>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
        <h4 style={{ marginBottom: "0.4rem" }}>Quick Note Picks</h4>
        <ul className="notes-list">
          {featuredNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      <div className="card section-row">
        <h3 style={{ marginTop: 0 }}>Recent Uploads</h3>
        {!recentUploads.length ? (
          <p className="muted">No uploads yet.</p>
        ) : (
          <ul className="compact-list">
            {recentUploads.slice(0, 8).map((r) => (
              <li key={r.id} style={{ marginBottom: "0.6rem" }}>
                <strong>{r.title}</strong> | {r.subject} | {r.year} | {r.privacy_level}
                <button
                  type="button"
                  className="ghost"
                  style={{ marginLeft: "0.6rem" }}
                  onClick={() => {
                    setQuickForm({
                      title: r.title || "",
                      subject: r.subject || "",
                      semester: String(r.semester || ""),
                      type: r.type || "notes",
                      branch: r.branch || "",
                      year: String(r.year || ""),
                      description: r.description || "",
                      privacyLevel: r.privacy_level || "public",
                      tags: (r.tags || []).join(","),
                    });
                    setStatus("Template loaded from existing resource. Select a file before upload.");
                  }}
                >
                  Use as Template
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
