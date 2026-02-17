import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResourceCard from "../components/ui/ResourceCard";
import { apiRequest } from "../lib/api";

const profileHighlights = [
  "Contributor badge: Uploading consistently every week",
  "Peer impact: Notes used in 3 branches this month",
  "Revision goal: Complete Sem notes by Friday",
];

const plannerSubjectCatalog = [
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

function targetBandFromGrade(grade) {
  if (grade === "A+") return 9.0;
  if (grade === "A") return 8.0;
  if (grade === "B") return 7.0;
  return 6.0;
}

function gradeFromSgpa(sgpa) {
  if (sgpa >= 9) return "A+";
  if (sgpa >= 8) return "A";
  if (sgpa >= 7) return "B";
  return "C";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function UserProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [targetGrade, setTargetGrade] = useState("A");
  const [weeklyHours, setWeeklyHours] = useState("12");
  const [currentSgpa, setCurrentSgpa] = useState("7.2");
  const [weeksToExam, setWeeksToExam] = useState("8");
  const [studyConsistency, setStudyConsistency] = useState("medium");
  const [attendanceRate, setAttendanceRate] = useState("78");
  const [selectedPlannerSubjects, setSelectedPlannerSubjects] = useState([
    "DBMS",
    "Operating Systems",
    "Computer Networks",
    "Data Structures",
  ]);

  const stats = useMemo(() => {
    const total = uploads.length;
    const publicCount = uploads.filter((u) => u.privacy === "public").length;
    const avgRating = total
      ? (uploads.reduce((sum, item) => sum + Number(item.avgRating || 0), 0) / total).toFixed(1)
      : "0.0";
    return [
      { label: "Total Uploads", value: total },
      { label: "Public Resources", value: publicCount },
      { label: "Average Rating", value: avgRating },
    ];
  }, [uploads]);

  const aiRecommendations = useMemo(() => {
    const topSubjects = uploads
      .map((u) => u.subject)
      .filter(Boolean)
      .slice(0, 3);
    const focus = topSubjects.length ? topSubjects.join(", ") : "DBMS, OS, Computer Networks";
    return [
      `AI suggests your next high-impact upload should cover: ${focus}.`,
      "Create one concise revision sheet and one PYQ answer key this week.",
      "Target 6-8 tags per upload for better discoverability and peer usage.",
    ];
  }, [uploads]);

  const aiGradePlanner = useMemo(() => {
    const hours = Math.max(4, Number(weeklyHours) || 8);
    const weeks = Math.max(1, Number(weeksToExam) || 6);
    const current = Math.max(0, Math.min(10, Number(currentSgpa) || 0));
    const target = targetBandFromGrade(targetGrade);
    const gap = Number((target - current).toFixed(2));
    const attendance = clamp(Number(attendanceRate) || 75, 40, 100);

    const subjectStats = new Map();
    uploads.forEach((item) => {
      const key = String(item.subject || "").trim();
      if (!key) return;
      if (!subjectStats.has(key)) {
        subjectStats.set(key, { count: 0, avgRating: 0, ratingsCount: 0 });
      }
      const stat = subjectStats.get(key);
      stat.count += 1;
      stat.avgRating += Number(item.avgRating || 0);
      stat.ratingsCount += Number(item.ratingsCount || 0);
    });

    const orderedSubjects = Array.from(subjectStats.entries()).map(([subject, stat]) => ({
      subject,
      materialCount: stat.count,
      qualitySignal: Number((stat.avgRating / Math.max(stat.count, 1)).toFixed(2)),
      peerUsage: stat.ratingsCount,
    }));

    orderedSubjects.sort((a, b) => {
      const scoreA = (a.materialCount * 0.5) + (a.qualitySignal * 0.3) + (a.peerUsage * 0.02);
      const scoreB = (b.materialCount * 0.5) + (b.qualitySignal * 0.3) + (b.peerUsage * 0.02);
      return scoreA - scoreB;
    });

    const subjectLookup = new Map(orderedSubjects.map((item) => [item.subject.toLowerCase(), item]));
    const selectedSubjectsDetailed = selectedPlannerSubjects.map((subject) => {
      const existing = subjectLookup.get(subject.toLowerCase());
      if (existing) return existing;
      return {
        subject,
        materialCount: 0,
        qualitySignal: 0,
        peerUsage: 0,
      };
    });

    const focusSubjects = selectedSubjectsDetailed.length
      ? selectedSubjectsDetailed
      : orderedSubjects.length
        ? orderedSubjects.slice(0, 4)
        : plannerSubjectCatalog.slice(0, 4).map((subject) => ({
            subject,
            materialCount: 0,
            qualitySignal: 0,
            peerUsage: 0,
          }));

    const consistencyMultiplier = studyConsistency === "high" ? 1.15 : studyConsistency === "low" ? 0.82 : 1;
    const effectiveWeeklyHours = Math.round(hours * consistencyMultiplier);
    const attendanceFactor = attendance >= 85 ? 1.08 : attendance >= 75 ? 1 : 0.9;
    const totalStudyCapacity = effectiveWeeklyHours * weeks;

    let riskScore = 0;
    if (gap > 1.2) riskScore += 2;
    else if (gap > 0.5) riskScore += 1;
    if (effectiveWeeklyHours < 10) riskScore += 2;
    else if (effectiveWeeklyHours < 14) riskScore += 1;
    if (studyConsistency === "low") riskScore += 2;
    else if (studyConsistency === "medium") riskScore += 1;
    if (attendance < 70) riskScore += 1;
    if (weeks <= 4) riskScore += 1;

    const riskLevel = riskScore >= 5 ? "high" : riskScore >= 3 ? "medium" : "low";
    const hourBand = effectiveWeeklyHours >= 18 ? "high" : effectiveWeeklyHours >= 11 ? "medium" : "low";
    const timePressure = weeks <= 3 ? "critical" : weeks <= 6 ? "high" : weeks <= 10 ? "medium" : "low";

    const readinessRaw = 62
      - (gap * 16)
      + (effectiveWeeklyHours * 2)
      + (studyConsistency === "high" ? 8 : studyConsistency === "medium" ? 2 : -8)
      + ((attendance - 75) * 0.7)
      + (weeks >= 8 ? 5 : weeks <= 3 ? -10 : 0);
    const targetConfidence = Math.round(clamp(readinessRaw, 5, 98));
    const potentialGain = (totalStudyCapacity / 95) * attendanceFactor * (studyConsistency === "high" ? 1.1 : studyConsistency === "low" ? 0.9 : 1);
    const projectedSgpa = Number(clamp(current + potentialGain, 0, 10).toFixed(2));
    const projectedGrade = gradeFromSgpa(projectedSgpa);
    const targetStatus = projectedSgpa >= target
      ? "On track"
      : projectedSgpa >= target - 0.3
        ? "Close to target"
        : "Needs recovery plan";
    const dailyMinutesTarget = Math.max(45, Math.round((effectiveWeeklyHours * 60) / 6));

    const weightedSlots = focusSubjects.map((_, index) => {
      const decay = riskLevel === "high" ? 1.35 : riskLevel === "medium" ? 1.2 : 1.1;
      return Math.pow(Math.max(focusSubjects.length - index, 1), decay);
    });
    const totalWeight = weightedSlots.reduce((sum, item) => sum + item, 0) || 1;
    const subjectHourPlan = focusSubjects.map((item, index) => {
      const normalizedWeight = weightedSlots[index] / totalWeight;
      const allocatedHours = Math.max(1, Math.round(effectiveWeeklyHours * normalizedWeight));
      return {
        ...item,
        weeklyHours: allocatedHours,
        sessions: Math.max(1, Math.round(allocatedHours / 1.5)),
      };
    });

    const phaseOneEnd = Math.max(1, Math.min(2, weeks));
    const phaseTwoStart = Math.min(3, weeks);
    const phaseTwoEnd = Math.min(5, weeks);
    const finalStart = Math.max(weeks - 2, 1);

    const pyqSetsPerSubject = targetGrade === "A+" ? 5 : targetGrade === "A" ? 4 : targetGrade === "B" ? 3 : 2;
    const mocksPerWeek = riskLevel === "high" ? 2 : 1;
    const plan = [
      `Target: ${targetGrade} (${target.toFixed(1)}+ SGPA) | Projected: ${projectedSgpa.toFixed(2)} (${projectedGrade}).`,
      `Confidence to hit target: ${targetConfidence}% (${targetStatus.toLowerCase()}).`,
      `Capacity mode: ${effectiveWeeklyHours} hrs/week (${studyConsistency} consistency, ${attendance}% attendance, ${hourBand} effort).`,
      targetGrade === "A+"
        ? "Execution split: 30% concepts, 40% answer writing, 30% revision + mocks."
        : targetGrade === "A"
          ? "Execution split: 40% concepts, 35% PYQ, 25% revision."
          : targetGrade === "B"
            ? "Execution split: 35% concepts, 45% PYQ, 20% revision."
            : "Execution split: 30% concepts, 50% PYQ, 20% revision.",
      `Daily target: ${dailyMinutesTarget} focused minutes with a fixed study slot.`,
    ];

    const weeklyRoadmap = [
      `Week 1-${phaseOneEnd}: Build core notes for weak units in ${subjectHourPlan.slice(0, 2).map((s) => s.subject).join(" + ")} and run daily recall drills.`,
      `Week ${phaseTwoStart}-${phaseTwoEnd}: Solve ${pyqSetsPerSubject} PYQ sets per focus subject and maintain an error notebook.`,
      `Week ${finalStart}-${weeks}: Attempt ${mocksPerWeek} timed mock(s)/week + same-day post-mock correction.`,
      timePressure === "critical"
        ? "Critical window mode: skip low-yield topics and shift to revision-first mixed testing."
        : "Stability mode: keep one weekly buffer day for backlog recovery and recap.",
    ];

    const interventions = [];
    if (targetStatus === "On track") {
      interventions.push("Maintain rhythm and increase one session/week for advanced practice.");
    } else if (targetStatus === "Close to target") {
      interventions.push("Add 2 extra hours/week for next 3 weeks to close the final gap.");
    } else {
      interventions.push("Recovery protocol: increase weekly hours by 4-6 for the next 3 weeks.");
      interventions.push("Drop passive reading and switch to active recall + written answer practice.");
    }

    if (attendance < 75) {
      interventions.push("Attendance risk detected: recover missed classes with weekend catch-up notes.");
    } else if (attendance >= 90) {
      interventions.push("Strong attendance advantage: convert class notes into weekly summary sheets.");
    }

    if (targetGrade === "A+") {
      interventions.push("For A+ target: write one model answer every alternate day.");
      interventions.push("Use one high-difficulty mock weekly under strict exam conditions.");
    } else if (targetGrade === "A") {
      interventions.push("For A target: complete 100% PYQ coverage for top 3 scoring units.");
    } else if (targetGrade === "B") {
      interventions.push("For B target: prioritize high-frequency questions and formula recall drills.");
    } else {
      interventions.push("For C target: lock pass-guarantee topics first, then add selected PYQs.");
    }

    if (studyConsistency === "low") {
      interventions.push("Low consistency: use two fixed daily slots (25m + 35m) with phone blockers.");
    } else if (studyConsistency === "high") {
      interventions.push("High consistency: shift 15% time to advanced questions and speed drills.");
    }

    if (weeks <= 4) {
      interventions.push("Exam window near: start daily mixed revision tests and reduce new topics.");
    } else if (weeks >= 10) {
      interventions.push("Long runway: complete one full concept cycle before intensive mocks.");
    }

    const dailyBlueprint = [
      `Mon-Tue: ${dailyMinutesTarget} min focus block for ${subjectHourPlan[0]?.subject || "DBMS"} (concept + PYQ).`,
      `Wed-Thu: ${dailyMinutesTarget} min answer-writing drills for ${subjectHourPlan[1]?.subject || "Operating Systems"}.`,
      `Fri: 45 min revision sprint + error log update + one short self-test.`,
      `Weekend: ${mocksPerWeek} timed mock(s), then a same-day mistake review session.`,
    ];

    return {
      target,
      current,
      gap,
      attendance,
      riskLevel,
      targetConfidence,
      projectedSgpa,
      projectedGrade,
      targetStatus,
      dailyMinutesTarget,
      focusSubjects: subjectHourPlan,
      plan,
      weeklyRoadmap,
      interventions,
      dailyBlueprint,
    };
  }, [uploads, targetGrade, weeklyHours, currentSgpa, weeksToExam, studyConsistency, attendanceRate, selectedPlannerSubjects]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [me, mine] = await Promise.all([
          apiRequest("/api/auth/me"),
          apiRequest("/api/resources/mine"),
        ]);
        setProfile(me.user);
        setUploads((mine.resources || []).map(mapApiResourceToCard));
      } catch (err) {
        setError(err.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/auth");
  }

  function togglePlannerSubject(subject) {
    setSelectedPlannerSubjects((prev) => {
      if (prev.includes(subject)) {
        if (prev.length === 1) return prev;
        return prev.filter((item) => item !== subject);
      }
      return [...prev, subject];
    });
  }

  const initials = profile?.name
    ? profile.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  return (
    <section>
      <div className="page-head">
        <h2 className="page-title">Profile</h2>
        <p className="page-subtitle">Your contribution summary, upload analytics, and personal study goals.</p>
      </div>

      <div className="profile-grid">
        <aside className="card card-light">
          <div className="inline-row" style={{ justifyContent: "space-between", marginTop: 0 }}>
            <h3 style={{ margin: 0 }}>User Profile</h3>
            <button type="button" className="ghost" onClick={logout}>Logout</button>
          </div>

          {loading && <p>Loading...</p>}
          {error && <p style={{ color: "#a62222" }}>{error}</p>}

          {profile && (
            <>
              <div className="profile-identity">
                <div className="avatar">{initials}</div>
                <div>
                  <strong>{profile.name}</strong>
                  <div className="muted">{profile.email}</div>
                </div>
              </div>

              <div className="profile-meta">
                <div><strong>College:</strong> {profile.college}</div>
                <div><strong>Branch:</strong> {profile.branch}</div>
                <div><strong>Semester:</strong> {profile.semester}</div>
              </div>
            </>
          )}

          <h4 style={{ marginBottom: "0.4rem" }}>Highlights</h4>
          <ul className="notes-list">
            {profileHighlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="stat-grid">
            {stats.map((item) => (
              <div className="stat-card" key={item.label}>
                <span className="stat-number">{item.value}</span>
                <span className="stat-label">{item.label}</span>
              </div>
            ))}
          </div>
        </aside>

        <div>
          <div className="card" style={{ marginBottom: "1rem" }}>
            <h3 style={{ marginTop: 0 }}>My Uploaded Resources</h3>
            {uploads.length ? (
              <div className="card-grid" style={{ marginTop: "0.5rem" }}>
                {uploads.map((item) => (
                  <ResourceCard key={item.id} resource={item} />
                ))}
              </div>
            ) : (
              <p className="muted">No resources uploaded yet.</p>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Personal Study Planner</h3>
            <ul className="notes-list">
              <li>Tuesday: Revise DBMS + solve 2 transaction-related PYQs</li>
              <li>Wednesday: OS memory management short notes update</li>
              <li>Thursday: CN numericals and viva preparation</li>
              <li>Friday: Upload cleaned notes with tags for juniors</li>
            </ul>
          </div>

          <div className="card glass-card" style={{ marginTop: "1rem" }}>
            <div className="ai-header">
              <h3 style={{ margin: 0 }}>Generative AI Mentor</h3>
              <span className="ai-badge"><span className="pulse-dot" />Adaptive</span>
            </div>
            <ul className="notes-list">
              {aiRecommendations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div className="card glass-card" style={{ marginTop: "1rem" }}>
            <div className="ai-header">
              <h3 style={{ margin: 0 }}>AI Grade Target Planner</h3>
              <span className="ai-badge"><span className="pulse-dot" />Goal Mode</span>
            </div>

            <div className="result-compare-grid" style={{ marginTop: "0.65rem" }}>
              <div>
                <label htmlFor="target-grade">Target Grade</label>
                <select id="target-grade" value={targetGrade} onChange={(e) => setTargetGrade(e.target.value)} style={{ marginTop: "0.35rem" }}>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              <div>
                <label htmlFor="current-sgpa">Current SGPA</label>
                <input
                  id="current-sgpa"
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
                <label htmlFor="weekly-hours">Study Hours / Week</label>
                <input
                  id="weekly-hours"
                  type="number"
                  min="4"
                  max="60"
                  value={weeklyHours}
                  onChange={(e) => setWeeklyHours(e.target.value)}
                  style={{ marginTop: "0.35rem" }}
                />
              </div>
              <div>
                <label htmlFor="weeks-to-exam">Weeks to Exam</label>
                <input
                  id="weeks-to-exam"
                  type="number"
                  min="1"
                  max="30"
                  value={weeksToExam}
                  onChange={(e) => setWeeksToExam(e.target.value)}
                  style={{ marginTop: "0.35rem" }}
                />
              </div>
              <div>
                <label htmlFor="study-consistency">Consistency</label>
                <select
                  id="study-consistency"
                  value={studyConsistency}
                  onChange={(e) => setStudyConsistency(e.target.value)}
                  style={{ marginTop: "0.35rem" }}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label htmlFor="attendance-rate">Attendance %</label>
                <input
                  id="attendance-rate"
                  type="number"
                  min="40"
                  max="100"
                  value={attendanceRate}
                  onChange={(e) => setAttendanceRate(e.target.value)}
                  style={{ marginTop: "0.35rem" }}
                />
              </div>
            </div>

            <h4 style={{ marginBottom: "0.35rem", marginTop: "0.8rem" }}>Planner Subjects (Select Multiple)</h4>
            <div className="quick-chip-row">
              {plannerSubjectCatalog.map((subject) => {
                const active = selectedPlannerSubjects.includes(subject);
                return (
                  <button
                    key={subject}
                    type="button"
                    className={`quick-chip ${active ? "ai-chip active" : ""}`}
                    onClick={() => togglePlannerSubject(subject)}
                  >
                    {subject}
                  </button>
                );
              })}
            </div>

            <div className="planner-kpi-grid">
              <div className="planner-kpi">
                <span className="muted">Target SGPA Band</span>
                <strong>{aiGradePlanner.target.toFixed(1)}+</strong>
              </div>
              <div className="planner-kpi">
                <span className="muted">Current SGPA</span>
                <strong>{aiGradePlanner.current.toFixed(2)}</strong>
              </div>
              <div className="planner-kpi">
                <span className="muted">Gap to Target</span>
                <strong className={aiGradePlanner.gap > 0 ? "trend-low" : "trend-good"}>
                  {aiGradePlanner.gap > 0 ? `+${aiGradePlanner.gap}` : aiGradePlanner.gap}
                </strong>
              </div>
              <div className="planner-kpi">
                <span className="muted">Risk Level</span>
                <strong className={aiGradePlanner.riskLevel === "low" ? "trend-good" : aiGradePlanner.riskLevel === "medium" ? "" : "trend-low"}>
                  {aiGradePlanner.riskLevel}
                </strong>
              </div>
              <div className="planner-kpi">
                <span className="muted">Projected SGPA</span>
                <strong>{aiGradePlanner.projectedSgpa.toFixed(2)} ({aiGradePlanner.projectedGrade})</strong>
              </div>
              <div className="planner-kpi">
                <span className="muted">Target Confidence</span>
                <strong>{aiGradePlanner.targetConfidence}%</strong>
              </div>
              <div className="planner-kpi">
                <span className="muted">Status</span>
                <strong className={aiGradePlanner.targetStatus === "On track" ? "trend-good" : aiGradePlanner.targetStatus === "Close to target" ? "" : "trend-low"}>
                  {aiGradePlanner.targetStatus}
                </strong>
              </div>
            </div>

            <h4 style={{ marginBottom: "0.35rem" }}>Subject-Wise Hour Recommendation</h4>
            <div className="planner-subject-grid">
              {aiGradePlanner.focusSubjects.map((item) => (
                <div key={item.subject} className="planner-subject-card">
                  <strong>{item.subject}</strong>
                  <p className="muted" style={{ margin: "0.3rem 0" }}>Material: {item.materialCount} | Quality: {item.qualitySignal}</p>
                  <span>{item.weeklyHours} hrs/week | {item.sessions} sessions</span>
                </div>
              ))}
            </div>

            <h4 style={{ marginBottom: "0.35rem" }}>Personalized Plan</h4>
            <ul className="notes-list">
              {aiGradePlanner.plan.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h4 style={{ marginBottom: "0.35rem" }}>Weekly Roadmap</h4>
            <ul className="notes-list">
              {aiGradePlanner.weeklyRoadmap.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h4 style={{ marginBottom: "0.35rem" }}>AI Interventions</h4>
            <ul className="notes-list">
              {aiGradePlanner.interventions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            <h4 style={{ marginBottom: "0.35rem" }}>Daily Execution Blueprint</h4>
            <ul className="notes-list">
              {aiGradePlanner.dailyBlueprint.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
