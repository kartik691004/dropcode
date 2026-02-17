import { useMemo, useRef, useState } from "react";
import { apiRequest } from "../lib/api";

const currentYear = String(new Date().getFullYear());

const initialForm = {
  title: "",
  subject: "",
  semester: "",
  type: "notes",
  branch: "CSE",
  year: currentYear,
  description: "",
  privacyLevel: "public",
};

const uploadTips = [
  "Step 1: Choose file",
  "Step 2: Add title + subject + semester",
  "Step 3: Click upload",
];

const sampleSubjects = [
  "Data Structures",
  "DBMS",
  "Operating Systems",
  "Computer Networks",
  "Machine Learning",
  "Compiler Design",
  "Software Engineering",
  "Cyber Security",
];

const quickTemplates = [
  {
    label: "Notes Upload",
    data: {
      type: "notes",
      privacyLevel: "public",
      description: "Unit-wise notes with key concepts and exam questions.",
      tags: "notes, quick-revision, exam",
    },
  },
  {
    label: "PYQ Upload",
    data: {
      type: "pyq",
      privacyLevel: "public",
      description: "Previous year question papers with topic tags.",
      tags: "pyq, previous-year, practice",
    },
  },
  {
    label: "Research Upload",
    data: {
      type: "research",
      privacyLevel: "public",
      description: "Research paper summary with key findings and references.",
      tags: "research, paper, summary",
    },
  },
];

const sampleFiles = [
  {
    name: "DBMS Normalization Notes",
    file: "/sample-files/dbms-normalization-notes.txt",
    meta: "Notes | TXT",
  },
  {
    name: "OS PYQ Practice Set",
    file: "/sample-files/os-pyq-practice.txt",
    meta: "Previous Papers | TXT",
  },
  {
    name: "ML Mini Research Summary",
    file: "/sample-files/ml-mini-research-summary.md",
    meta: "Research Paper (demo) | MD",
  },
];

export default function UploadResourcePage() {
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [suggestedTags, setSuggestedTags] = useState([]);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [preGrade, setPreGrade] = useState(null);
  const [extractionWarning, setExtractionWarning] = useState("");
  const [targetGrade, setTargetGrade] = useState("A");
  const [pendingDuplicate, setPendingDuplicate] = useState(null);

  const editableTags = useMemo(() => {
    if (tagsInput.trim()) {
      return tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    return suggestedTags;
  }, [tagsInput, suggestedTags]);

  const aiDraft = useMemo(() => {
    const title = form.title.trim() || "Untitled Resource";
    const subject = form.subject.trim() || "General Subject";
    const semester = form.semester.trim() || "Current Semester";
    const tagList = editableTags.length ? editableTags.slice(0, 5).join(", ") : "quick-revision, exam-focus";
    return {
      smartTitle: `${subject} | ${title} | Sem ${semester}`,
      summary: `This resource covers ${subject} for semester ${semester} in concise exam-ready language.`,
      tagList,
    };
  }, [form, editableTags]);

  const targetRecommendation = useMemo(() => {
    if (!preGrade?.grade) return null;
    const order = { "A+": 5, A: 4, B: 3, C: 2, D: 1 };
    const currentScore = order[String(preGrade.grade).toUpperCase()] || 1;
    const targetScore = order[String(targetGrade).toUpperCase()] || 4;
    const delta = targetScore - currentScore;

    if (delta <= 0) {
      return {
        status: "on-track",
        text: `You are on track for target grade ${targetGrade}. Maintain consistency and keep solving PYQs.`,
        steps: [
          "Keep current structure and depth.",
          "Add one revision summary page at the end.",
          "Run one timed self-test after each unit.",
        ],
      };
    }

    if (delta === 1) {
      return {
        status: "near-target",
        text: `You are close to target grade ${targetGrade}. One quality jump is needed.`,
        steps: [
          "Increase explanation depth for key concepts.",
          "Add at least 5 exam-style questions with answers.",
          "Use clearer headings: Unit, Formula, Example, Revision.",
        ],
      };
    }

    return {
      status: "needs-work",
      text: `Current note quality is below target grade ${targetGrade}. Apply these upgrades before upload.`,
      steps: [
        "Expand notes with complete unit coverage (examples + diagrams).",
        "Add PYQ section and solved answers for at least 2 years.",
        "Improve terminology accuracy and remove vague statements.",
      ],
    };
  }, [preGrade, targetGrade]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function applyTemplate(template) {
    updateField("type", template.data.type);
    updateField("privacyLevel", template.data.privacyLevel);
    updateField("description", template.data.description);
    setTagsInput(template.data.tags);
  }

  function onChooseFileClick() {
    fileInputRef.current?.click();
  }

  function onDropFile(e) {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer?.files?.[0] || null;
    if (dropped) setFile(dropped);
  }

  async function handleSuggestTags() {
    try {
      setError("");
      setMessage("");
      setExtractionWarning("");
      if (!form.title.trim()) {
        setError("Enter title before suggesting tags.");
        return;
      }
      setLoadingSuggest(true);

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("subject", form.subject);
      if (file) fd.append("file", file);
      const res = await apiRequest("/api/resources/suggest-tags", { method: "POST", body: fd });
      setSuggestedTags(res.suggestedTags || []);
      setTagsInput((res.suggestedTags || []).join(", "));
      setMessage("AI suggested tags are ready.");
      setPreGrade(res.preGrade || null);
      setExtractionWarning(res.extractionWarning || "");
    } catch (err) {
      setError(err.message || "Failed to suggest tags");
    } finally {
      setLoadingSuggest(false);
    }
  }

  async function uploadResource(confirmDuplicate = false) {
    try {
      setError("");
      setMessage("");
      setLoadingUpload(true);

      if (!file) {
        setError("Please choose a file.");
        return;
      }

      if (!form.title.trim() || !form.subject.trim() || !form.semester.trim()) {
        setError("Please fill Title, Subject, and Semester.");
        return;
      }

      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title.trim());
      fd.append("subject", form.subject.trim());
      fd.append("semester", form.semester.trim());
      fd.append("type", (form.type || "notes").trim());
      fd.append("branch", (form.branch || "CSE").trim());
      fd.append("year", (form.year || currentYear).trim());
      fd.append("description", (form.description || aiDraft.summary).trim());
      fd.append("privacyLevel", form.privacyLevel || "public");
      fd.append("tags", editableTags.join(","));
      if (confirmDuplicate) fd.append("confirmDuplicate", "true");

      const res = await apiRequest("/api/resources/upload", { method: "POST", body: fd });
      setMessage(`Uploaded successfully (Resource #${res.resource.id}).`);
      setPendingDuplicate(null);
      setSuggestedTags(res.suggestedTags || []);
      setForm(initialForm);
      setTagsInput("");
      setFile(null);
    } catch (err) {
      const msg = err.message || "Upload failed";
      if (err?.status === 409 && err?.data?.requiresConfirmation) {
        const payload = err.data;
        setPendingDuplicate(payload);
        setSuggestedTags(payload.suggestedTags || []);
        if (!tagsInput.trim() && payload.suggestedTags) {
          setTagsInput(payload.suggestedTags.join(", "));
        }
        setError("Similar resources found. Review and confirm if you still want to upload.");
        return;
      }
      setError(msg);
    } finally {
      setLoadingUpload(false);
    }
  }

  return (
    <section>
      <div className="page-head">
        <h2 className="page-title">Upload Resource</h2>
        <p className="page-subtitle">Simple student flow: pick file, fill basics, upload. Advanced options are optional.</p>
      </div>

      <div className="upload-layout">
        <div className="card">
          <div className="stepper">
            {uploadTips.map((tip) => (
              <div key={tip} className="step-card">{tip}</div>
            ))}
          </div>

          <div className={`file-dropzone ${dragActive ? "active" : ""}`}>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required={!file}
            />
            <p style={{ margin: "0 0 0.35rem" }}>
              {file ? `Selected: ${file.name}` : "Step 1: Select file to upload"}
            </p>
            <div className="inline-row" style={{ marginTop: 0 }}>
              <button type="button" className="ghost" onClick={onChooseFileClick}>Choose File</button>
              {file && (
                <button type="button" className="ghost" onClick={() => setFile(null)}>Clear</button>
              )}
            </div>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDropFile}
            >
              <p className="muted" style={{ margin: "0.3rem 0 0" }}>You can also drag and drop here.</p>
            </div>
          </div>

          <form
            className="form two-col"
            style={{ marginTop: "0.8rem" }}
            onSubmit={(e) => {
              e.preventDefault();
              uploadResource(false);
            }}
          >
            <input placeholder="Step 2: Title" value={form.title} onChange={(e) => updateField("title", e.target.value)} required />
            <select value={form.subject} onChange={(e) => updateField("subject", e.target.value)} required>
              <option value="">Step 2: Choose Subject</option>
              {sampleSubjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
            <input placeholder="Step 2: Semester (e.g. 4)" value={form.semester} onChange={(e) => updateField("semester", e.target.value)} required />
            <select value={form.privacyLevel} onChange={(e) => updateField("privacyLevel", e.target.value)}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>

            <div className="col-span">
              <h4 style={{ margin: "0.25rem 0" }}>Quick Template</h4>
              <div className="quick-chip-row">
                {quickTemplates.map((template) => (
                  <button key={template.label} type="button" className="quick-chip" onClick={() => applyTemplate(template)}>
                    {template.label}
                  </button>
                ))}
              </div>
            </div>

            <details className="col-span advanced-box">
              <summary>Optional: Advanced details</summary>
              <div className="form two-col" style={{ marginTop: "0.6rem" }}>
                <input placeholder="Type" value={form.type} onChange={(e) => updateField("type", e.target.value)} />
                <input placeholder="Branch" value={form.branch} onChange={(e) => updateField("branch", e.target.value)} />
                <input placeholder="Year" value={form.year} onChange={(e) => updateField("year", e.target.value)} />
                <input
                  placeholder="Tags (comma-separated)"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                />
                <textarea
                  placeholder="Description"
                  className="col-span"
                  rows="3"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                />
              </div>
            </details>

            {!!suggestedTags.length && (
              <div className="col-span tag-wrap">
                {suggestedTags.map((t) => (
                  <span className="tag-chip" key={t}>{t}</span>
                ))}
              </div>
            )}

            <div className="col-span inline-row">
              <button type="button" className="ghost" onClick={handleSuggestTags} disabled={loadingSuggest}>
                {loadingSuggest ? "Analyzing..." : "AI Suggest + Pre-Grade"}
              </button>
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  updateField("description", aiDraft.summary);
                  setTagsInput(aiDraft.tagList);
                }}
              >
                Use AI Draft
              </button>
              <button type="submit" disabled={loadingUpload}>
                {loadingUpload ? "Uploading..." : "Step 3: Upload"}
              </button>
            </div>
          </form>

          {message && <p style={{ color: "#1f7a3b" }}>{message}</p>}
          {error && <p style={{ color: "#a62222" }}>{error}</p>}
          {extractionWarning && <p className="muted">{extractionWarning}</p>}

          {preGrade && (
            <div className="card grade-box" style={{ marginTop: "0.9rem" }}>
              <div className="inline-row" style={{ justifyContent: "space-between", marginTop: 0 }}>
                <h3 style={{ margin: 0 }}>AI Pre-Upload Grade</h3>
                <span className={`grade-pill grade-${String(preGrade.grade || "D").toLowerCase()}`}>
                  {preGrade.grade} ({preGrade.score}/100)
                </span>
              </div>
              <div className="result-compare-grid" style={{ marginTop: "0.65rem" }}>
                <div>
                  <label htmlFor="target-grade-upload">Target Grade</label>
                  <select
                    id="target-grade-upload"
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
              </div>
              <p className="muted" style={{ marginTop: "0.45rem" }}>{preGrade.verdict}</p>
              {targetRecommendation && (
                <>
                  <p className={`muted ${targetRecommendation.status === "on-track" ? "trend-good" : targetRecommendation.status === "near-target" ? "" : "trend-low"}`}>
                    {targetRecommendation.text}
                  </p>
                  <ul className="notes-list">
                    {targetRecommendation.steps.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </>
              )}
              <div className="ai-mini-stat">
                <div className="ai-mini-box">
                  <span className="muted">Estimated Accuracy</span>
                  <strong>{preGrade.metrics?.estimatedAccuracy || 0}%</strong>
                </div>
                <div className="ai-mini-box">
                  <span className="muted">Word Count</span>
                  <strong>{preGrade.metrics?.wordCount || 0}</strong>
                </div>
                <div className="ai-mini-box">
                  <span className="muted">Question Count</span>
                  <strong>{preGrade.metrics?.questionCount || 0}</strong>
                </div>
              </div>
              <h4 style={{ marginBottom: "0.35rem" }}>Strengths</h4>
              <ul className="notes-list">
                {(preGrade.strengths || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <h4 style={{ marginBottom: "0.35rem" }}>Improvements</h4>
              <ul className="notes-list">
                {(preGrade.improvements || []).map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {pendingDuplicate && (
            <div className="card duplicate-box" style={{ marginTop: "1rem" }}>
              <h3>Similar Resources Found</h3>
              <p className="muted">Open similar resources first, or continue upload.</p>
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
              <button type="button" onClick={() => uploadResource(true)} disabled={loadingUpload}>
                {loadingUpload ? "Uploading..." : "Upload Anyway"}
              </button>
            </div>
          )}
        </div>

        <aside className="card card-light">
          <h3 style={{ marginTop: 0 }}>Helpful Panel</h3>
          <p className="muted">This section helps first-time students upload faster.</p>

          <h4 style={{ marginBottom: "0.45rem" }}>Random Files Added (Open/Download)</h4>
          <div className="sample-file-list">
            {sampleFiles.map((item) => (
              <div key={item.file} className="sample-file-item">
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted" style={{ fontSize: "0.86rem" }}>{item.meta}</div>
                </div>
                <a href={item.file} target="_blank" rel="noreferrer" className="btn-link">Open</a>
              </div>
            ))}
          </div>

          <div className="card glass-card" style={{ marginTop: "0.9rem", boxShadow: "none" }}>
            <div className="ai-header">
              <h4 style={{ margin: 0 }}>AI Upload Preview</h4>
              <span className="ai-badge"><span className="pulse-dot" />Smart</span>
            </div>
            <p className="muted" style={{ marginTop: "0.45rem" }}>{aiDraft.smartTitle}</p>
            <p style={{ marginBottom: "0.4rem" }}>{aiDraft.summary}</p>
            <p className="muted" style={{ marginBottom: "0.4rem" }}>Suggested tags: {aiDraft.tagList}</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
