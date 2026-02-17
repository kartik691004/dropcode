import { useEffect, useState } from "react";
import ResourceCard from "../components/ui/ResourceCard";
import { apiRequest } from "../lib/api";

const quickSuggestions = [
  "Data Structures notes",
  "DBMS PYQ",
  "Operating Systems viva",
  "Computer Networks unit 4",
  "Machine Learning short notes",
  "Cyber Security research paper",
];

const subjectLibrary = [
  {
    subject: "Data Structures",
    slug: "data-structures",
    keywords: ["data structures", "ds", "trees", "graphs"],
    notes: "Tree/graph cheatsheet + complexity quick notes",
    pyq: "2019-2025 solved PYQs",
    research: "Efficient Graph Representation for Sparse Systems (2023)",
  },
  {
    subject: "Algorithms",
    slug: "algorithms",
    keywords: ["algorithms", "algo", "dp", "greedy"],
    notes: "Greedy, DP, and divide-conquer exam map",
    pyq: "2020-2025 algorithm design papers",
    research: "Approximation Bounds for NP-hard Variants (2022)",
  },
  {
    subject: "DBMS",
    slug: "dbms",
    keywords: ["dbms", "database", "sql", "normalization"],
    notes: "Normalization + transaction management notes",
    pyq: "2018-2025 DBMS PYQ collection",
    research: "Adaptive Indexing in Hybrid Databases (2024)",
  },
  {
    subject: "Operating Systems",
    slug: "operating-systems",
    keywords: ["operating systems", "os", "scheduling", "deadlock"],
    notes: "Scheduling + deadlock + memory unit notes",
    pyq: "2019-2025 OS question bank",
    research: "Predictive Scheduling for Multi-core Workloads (2023)",
  },
  {
    subject: "Computer Networks",
    slug: "computer-networks",
    keywords: ["computer networks", "cn", "networking", "tcp ip"],
    notes: "OSI/TCP-IP + routing concise notes",
    pyq: "2020-2025 CN semester papers",
    research: "Low-Latency Congestion Control in WANs (2022)",
  },
  {
    subject: "Software Engineering",
    slug: "software-engineering",
    keywords: ["software engineering", "se", "sdlc", "testing"],
    notes: "SDLC models, testing, and metrics notes",
    pyq: "2017-2025 SE PYQ papers",
    research: "AI-assisted Defect Prediction in Agile Teams (2024)",
  },
  {
    subject: "Artificial Intelligence",
    slug: "artificial-intelligence",
    keywords: ["artificial intelligence", "ai", "planning", "logic"],
    notes: "Search strategies + logic + planning notes",
    pyq: "2019-2025 AI exam paper set",
    research: "Reasoning with Neuro-Symbolic Pipelines (2023)",
  },
  {
    subject: "Machine Learning",
    slug: "machine-learning",
    keywords: ["machine learning", "ml", "regression", "classification"],
    notes: "Model comparison + bias/variance revision sheet",
    pyq: "2020-2025 ML PYQ and lab questions",
    research: "Robust Fine-tuning with Limited Labels (2024)",
  },
  {
    subject: "Compiler Design",
    slug: "compiler-design",
    keywords: ["compiler design", "compiler", "parsing", "code generation"],
    notes: "Lexical parsing + code generation notes",
    pyq: "2018-2025 compiler PYQs",
    research: "Optimization-aware Intermediate Representations (2022)",
  },
  {
    subject: "Theory of Computation",
    slug: "theory-of-computation",
    keywords: ["theory of computation", "toc", "automata", "pda"],
    notes: "DFA/NFA/PDA and pumping lemma summary",
    pyq: "2017-2025 TOC previous papers",
    research: "Automata Minimization with Constraint Solvers (2021)",
  },
  {
    subject: "Cyber Security",
    slug: "cyber-security",
    keywords: ["cyber security", "security", "cryptography", "infosec"],
    notes: "Cryptography + network security short notes",
    pyq: "2019-2025 security PYQ set",
    research: "Zero-Trust Enforcement in Campus Networks (2024)",
  },
  {
    subject: "Cloud Computing",
    slug: "cloud-computing",
    keywords: ["cloud computing", "cloud", "virtualization", "distributed"],
    notes: "Virtualization + distributed systems notes",
    pyq: "2020-2025 cloud exam papers",
    research: "Energy-aware Scheduling in Cloud Data Centers (2023)",
  },
];

const searchSampleFiles = [
  {
    name: "Data Structures Notes",
    file: "/sample-files/data-structures-notes.txt",
    meta: "Notes | TXT",
  },
  {
    name: "Algorithms PYQ",
    file: "/sample-files/algorithms-pyq.txt",
    meta: "Previous Papers | TXT",
  },
  {
    name: "DBMS Research",
    file: "/sample-files/dbms-research.txt",
    meta: "Research | TXT",
  },
  {
    name: "Operating Systems Notes",
    file: "/sample-files/operating-systems-notes.txt",
    meta: "Notes | TXT",
  },
  {
    name: "Machine Learning PYQ",
    file: "/sample-files/machine-learning-pyq.txt",
    meta: "Previous Papers | TXT",
  },
  {
    name: "Cloud Computing Research",
    file: "/sample-files/cloud-computing-research.txt",
    meta: "Research | TXT",
  },
];

function getSubjectFiles(subjectItem) {
  return {
    notes: `/sample-files/${subjectItem.slug}-notes.txt`,
    pyq: `/sample-files/${subjectItem.slug}-pyq.txt`,
    research: `/sample-files/${subjectItem.slug}-research.txt`,
  };
}

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
    fileUrl: item.file_url || "",
  };
}

function mockResourceFromSubject(item, index) {
  const subjectFiles = getSubjectFiles(item);
  const type = index % 3 === 0 ? "notes" : index % 3 === 1 ? "pyq" : "research";
  const fileUrl = type === "notes" ? subjectFiles.notes : type === "pyq" ? subjectFiles.pyq : subjectFiles.research;

  return {
    id: `${item.slug || item.subject}-${index + 1}`,
    title: `${item.subject} - Resource Pack ${index + 1}`,
    subject: item.subject,
    semester: 4 + (index % 3),
    type,
    branch: "CSE",
    privacy: "public",
    avgRating: 4.2 - (index * 0.2),
    ratingsCount: 20 + index * 8,
    description: type === "notes" ? item.notes : type === "pyq" ? item.pyq : item.research,
    fileUrl,
  };
}

function buildFallbackResources(query = "") {
  const needle = String(query || "").toLowerCase().trim();
  const matchedSubjects = needle
    ? subjectLibrary.filter((item) => {
        const subject = item.subject.toLowerCase();
        return (
          subject.includes(needle) ||
          needle.includes(subject) ||
          (item.keywords || []).some((keyword) => needle.includes(keyword))
        );
      })
    : [];

  const source = matchedSubjects.length ? matchedSubjects : subjectLibrary;
  return source.slice(0, 6).flatMap((item) => ([
    mockResourceFromSubject(item, 0),
    mockResourceFromSubject(item, 1),
    mockResourceFromSubject(item, 2),
  ]));
}

export default function SearchFilterPage() {
  const [filters, setFilters] = useState({
    q: "",
    semester: "",
    type: "",
    branch: "",
    year: "",
    privacyLevel: "",
    sort: "latest",
  });
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSubject, setActiveSubject] = useState("");

  function handleSubjectSearch(item) {
    const updated = { ...filters, q: "", subject: item.subject };
    setFilters(updated);
    setActiveSubject(item.subject);
    setError("");
    setResources([
      mockResourceFromSubject(item, 0),
      mockResourceFromSubject(item, 1),
      mockResourceFromSubject(item, 2),
    ]);
    loadResults(updated);
  }

  async function loadResults(activeFilters = filters) {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([k, v]) => {
        if (String(v).trim()) params.set(k, String(v).trim());
      });
      params.set("page", "1");
      params.set("limit", "20");
      const res = await apiRequest(`/api/resources/search?${params.toString()}`);
      const mapped = (res.resources || []).map(mapApiResourceToCard);
      if (mapped.length) {
        setResources(mapped);
        return;
      }

      const fallbackSubject = activeFilters.subject || activeFilters.q || activeSubject;
      if (fallbackSubject) {
        const matched = subjectLibrary.find(
          (item) => {
            const needle = String(fallbackSubject).toLowerCase();
            const subject = item.subject.toLowerCase();
            return (
              subject === needle ||
              needle.includes(subject) ||
              subject.includes(needle) ||
              (item.keywords || []).some((keyword) => needle.includes(keyword))
            );
          }
        );
        if (matched) {
          setResources([
            mockResourceFromSubject(matched, 0),
            mockResourceFromSubject(matched, 1),
            mockResourceFromSubject(matched, 2),
          ]);
          return;
        }
      }
      setResources(buildFallbackResources(activeFilters.q || activeFilters.subject || activeSubject));
    } catch (err) {
      setError((err.message || "Failed to load resources") + " | Showing sample resources");
      setResources(buildFallbackResources(activeFilters.q || activeFilters.subject || activeSubject));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  return (
    <section>
      <div className="page-head">
        <h2 className="page-title">Search and Filter</h2>
        <p className="page-subtitle">Find notes, PYQs, PPTs, and lab resources with cleaner filters and quick subject shortcuts.</p>
      </div>

      <div className="search-layout">
        <aside className="card card-light">
          <h3 style={{ marginTop: 0 }}>Search Controls</h3>
          <div className="filter-bar">
            <input
              placeholder="Search by title or subject"
              value={filters.q}
              onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value }))}
            />
            <input
              placeholder="Semester"
              value={filters.semester}
              onChange={(e) => setFilters((p) => ({ ...p, semester: e.target.value }))}
            />
            <input
              placeholder="Type"
              value={filters.type}
              onChange={(e) => setFilters((p) => ({ ...p, type: e.target.value }))}
            />
            <input
              placeholder="Branch"
              value={filters.branch}
              onChange={(e) => setFilters((p) => ({ ...p, branch: e.target.value }))}
            />
            <input
              placeholder="Year"
              value={filters.year}
              onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))}
            />
            <select
              value={filters.privacyLevel}
              onChange={(e) => setFilters((p) => ({ ...p, privacyLevel: e.target.value }))}
            >
              <option value="">Privacy</option>
              <option value="public">public</option>
              <option value="private">private</option>
            </select>
            <select
              value={filters.sort}
              onChange={(e) => setFilters((p) => ({ ...p, sort: e.target.value }))}
            >
              <option value="latest">Sort: Latest</option>
              <option value="highest_rated">Highest Rated</option>
              <option value="most_popular">Most Popular</option>
              <option value="priority">Priority</option>
            </select>
            <button type="button" onClick={() => loadResults()}>
              Apply Filters
            </button>
          </div>

          <h4 style={{ marginBottom: "0.45rem" }}>Quick Topics</h4>
          <div className="quick-chip-row">
            {quickSuggestions.map((topic) => (
              <button
                key={topic}
                type="button"
                className="quick-chip"
                onClick={() => {
                  const updated = { ...filters, q: topic, subject: "" };
                  setFilters(updated);
                  setActiveSubject("");
                  loadResults(updated);
                }}
              >
                {topic}
              </button>
            ))}
          </div>

          <h4 style={{ marginBottom: "0.45rem" }}>12 Subject Search Column</h4>
          <div className="subject-library">
            {subjectLibrary.map((item) => {
              const subjectFiles = getSubjectFiles(item);
              return (
              <div key={item.subject} className="subject-library-card">
                <div className="inline-row" style={{ justifyContent: "space-between", marginTop: 0 }}>
                  <strong>{item.subject}</strong>
                  <button
                    type="button"
                    className="subject-search-btn"
                    onClick={() => handleSubjectSearch(item)}
                  >
                    Search
                  </button>
                </div>
                <ul className="notes-list" style={{ marginTop: "0.2rem" }}>
                  <li><span className="muted">Notes:</span> {item.notes}</li>
                  <li><span className="muted">Previous Papers:</span> {item.pyq}</li>
                  <li><span className="muted">Research Paper:</span> {item.research}</li>
                </ul>
                <div className="inline-row" style={{ marginTop: "0.45rem" }}>
                  <a href={subjectFiles.notes} target="_blank" rel="noreferrer" className="btn-link">Open Notes</a>
                  <a href={subjectFiles.pyq} target="_blank" rel="noreferrer" className="btn-link">Open PYQ</a>
                  <a href={subjectFiles.research} target="_blank" rel="noreferrer" className="btn-link">Open Research</a>
                </div>
              </div>
              );
            })}
          </div>

          <h4 style={{ marginBottom: "0.45rem", marginTop: "0.8rem" }}>Random Files (Open/Download)</h4>
          <div className="sample-file-list">
            {searchSampleFiles.map((item) => (
              <div key={item.file} className="sample-file-item">
                <div>
                  <strong>{item.name}</strong>
                  <div className="muted" style={{ fontSize: "0.86rem" }}>{item.meta}</div>
                </div>
                <a href={item.file} target="_blank" rel="noreferrer" className="btn-link">Open</a>
              </div>
            ))}
          </div>
        </aside>

        <div>
          <div className="card" style={{ marginBottom: "0.8rem" }}>
            <strong>{resources.length}</strong> resources found
            {loading && <span className="muted"> | Refreshing results...</span>}
            {error && <p style={{ color: "#a62222", marginBottom: 0 }}>{error}</p>}
          </div>
          <div className="card-grid" style={{ marginTop: 0 }}>
            {resources.length ? (
              resources.map((item) => <ResourceCard key={item.id} resource={item} />)
            ) : (
              <div className="card card-light">
                <h4 style={{ marginTop: 0 }}>No exact matches yet</h4>
                <p className="muted">Try broader terms like "unit notes", "viva", "lab manual", or choose a quick topic on the left.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
