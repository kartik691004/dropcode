import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import RatingStars from "../components/ui/RatingStars";
import { apiRequest } from "../lib/api";

export default function ResourceDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const routeResource = location.state?.resource || null;
  const isApiResourceId = /^\d+$/.test(String(id));
  const [resource, setResource] = useState(null);
  const [insights, setInsights] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [focusMode, setFocusMode] = useState("exam");

  const reviewExistsForMe = useMemo(() => {
    const me = JSON.parse(localStorage.getItem("user") || "{}");
    return reviews.some((r) => Number(r.user_id) === Number(me.id));
  }, [reviews]);

  const focusModes = [
    { id: "exam", label: "Exam Prep" },
    { id: "viva", label: "Viva Prep" },
    { id: "quick", label: "Quick Revision" },
  ];

  const aiActionPlan = useMemo(() => {
    if (!insights) return [];
    const firstConcept = (insights.importantConcepts?.[0] || insights.keyTopics?.[0] || "core topic");
    if (focusMode === "viva") {
      return [
        `Define ${firstConcept} in under 30 seconds.`,
        "Prepare one practical example for each key concept.",
        "Practice 10 rapid-fire oral questions with concise answers.",
      ];
    }
    if (focusMode === "quick") {
      return [
        "Read summary once, then mark unfamiliar keywords.",
        "Revise only top 5 key points and 5 revision notes.",
        "Solve 3 important questions before ending the session.",
      ];
    }
    return [
      "Cover summary + key points with 25-minute timer blocks.",
      "Write answers for 5 important questions without looking.",
      "Use revision notes for final 10-minute memory recall.",
    ];
  }, [insights, focusMode]);

  const flashcards = useMemo(() => {
    if (!insights) return [];
    const concepts = insights.importantConcepts?.length ? insights.importantConcepts : insights.keyTopics || [];
    const questions = insights.revisionQuestions || [];
    return concepts.slice(0, 2).map((concept, idx) => ({
      q: `What is ${concept}?`,
      a: insights.revisionNotes?.[idx] || `Key idea: ${concept} with one use-case and exam relevance.`,
    })).concat(
      questions.slice(0, 2).map((q, idx) => ({
        q,
        a: insights.keyPoints?.[idx] || "Answer using definition, example, and one comparison.",
      }))
    );
  }, [insights]);

  async function loadAll() {
    try {
      setLoading(true);
      setError("");
      if (!isApiResourceId && routeResource) {
        setResource({
          id: routeResource.id,
          title: routeResource.title,
          subject: routeResource.subject,
          semester: routeResource.semester,
          type: routeResource.type,
          branch: routeResource.branch,
          year: routeResource.year || new Date().getFullYear(),
          privacy_level: routeResource.privacy || "public",
          file_url: routeResource.fileUrl || "",
          avg_rating: routeResource.avgRating || 0,
          ratings_count: routeResource.ratingsCount || 0,
          description: routeResource.description || "",
        });
        setReviews([]);
        return;
      }
      const [resourceRes, reviewsRes] = await Promise.all([
        apiRequest(`/api/resources/${id}`),
        apiRequest(`/api/resources/${id}/reviews`),
      ]);
      setResource(resourceRes.resource);
      setReviews(reviewsRes.reviews || []);
    } catch (err) {
      setError(err.message || "Failed to load resource");
    } finally {
      setLoading(false);
    }
  }

  async function loadInsights(regenerate = false) {
    try {
      if (!isApiResourceId) {
        setInsights({
          summary: resource?.description || "Quick summary for this sample resource.",
          keyPoints: [
            `Core areas in ${resource?.subject || "the subject"} are covered in this resource.`,
            "Focus on repeated PYQ patterns and high-weight concepts.",
            "Revise with short active recall rounds after each section.",
          ],
          importantConcepts: [
            "High-yield unit mapping",
            "Answer writing structure",
            "Revision checklist",
          ],
          revisionQuestions: [
            "List the top 5 repeated questions from this unit.",
            "Write one 10-mark answer using points + diagram.",
            "What are common mistakes students make in this topic?",
          ],
          revisionNotes: [
            "Use concise notes and solve PYQs in timed mode.",
            "Track mistakes in an error log and revise weekly.",
            "Prioritize high-frequency topics first.",
          ],
        });
        return;
      }
      setInsightLoading(true);
      const data = await apiRequest(`/api/resources/${id}/study-assistant${regenerate ? "?regenerate=true" : ""}`);
      setInsights(data.insights);
    } catch (err) {
      setError(err.message || "Failed to generate insights");
    } finally {
      setInsightLoading(false);
    }
  }

  async function submitReview() {
    try {
      if (!isApiResourceId) return;
      if (reviewExistsForMe) {
        await apiRequest(`/api/resources/${id}/reviews/me`, {
          method: "PATCH",
          body: JSON.stringify({ rating, reviewText }),
        });
      } else {
        await apiRequest(`/api/resources/${id}/reviews`, {
          method: "POST",
          body: JSON.stringify({ rating, reviewText }),
        });
      }
      setReviewText("");
      await loadAll();
    } catch (err) {
      setError(err.message || "Failed to submit review");
    }
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  if (loading) return <section className="card">Loading...</section>;
  if (error) return <section className="card">{error}</section>;
  if (!resource) return <section className="card">Resource not found.</section>;

  return (
    <section className={`card ${studyMode ? "study-mode-shell" : ""}`}>
      <div className="inline-row">
        <h2 style={{ margin: 0 }}>Resource Detail #{id}</h2>
        <button
          type="button"
          className={studyMode ? "" : "ghost"}
          onClick={async () => {
            const next = !studyMode;
            setStudyMode(next);
            if (next && !insights) await loadInsights(false);
          }}
        >
          {studyMode ? "Exit Study Mode" : "Study Mode"}
        </button>
      </div>

      {!studyMode && <div className="detail-grid">
        <div>
          <h3>{resource.title}</h3>
          <p>Subject: {resource.subject}</p>
          <p>Semester: {resource.semester}</p>
          <p>Type: {resource.type}</p>
          <p>Branch: {resource.branch}</p>
          <p>Year: {resource.year}</p>
          <p>Privacy: {resource.privacy_level}</p>
          {resource.file_url ? (
            <a href={resource.file_url} target="_blank" rel="noreferrer">Open File</a>
          ) : (
            <p className="muted">No attached file URL for this resource.</p>
          )}
        </div>
        {isApiResourceId ? (
        <div>
          <RatingStars rating={Number(resource.avg_rating || 0)} count={Number(resource.ratings_count || 0)} size="lg" />
          <label htmlFor="rating">Your rating (1-5)</label>
          <input
            id="rating"
            type="number"
            min="1"
            max="5"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          />
          <textarea
            rows="3"
            placeholder="Add your review"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
          />
          <div className="inline-row">
            <button type="button" onClick={submitReview}>
              {reviewExistsForMe ? "Edit Review" : "Submit Review"}
            </button>
            <button type="button" className="ghost" onClick={() => loadInsights(true)}>
              Regenerate AI Notes
            </button>
          </div>
        </div>
        ) : (
        <div>
          <RatingStars rating={Number(resource.avg_rating || 0)} count={Number(resource.ratings_count || 0)} size="lg" />
          <p className="muted">Sample resource mode: reviews are disabled for local demo resources.</p>
          <button type="button" onClick={() => loadInsights(false)}>
            Generate Study Notes
          </button>
        </div>
        )}
      </div>}

      <div className={`card ${studyMode ? "study-mode-panel" : ""}`} style={{ marginTop: "1rem" }}>
        <div className="inline-row">
          <h3 style={{ margin: 0 }}>{studyMode ? "Study Mode" : "AI Study Assistant"}</h3>
          <button type="button" onClick={() => loadInsights(false)}>
            {insightLoading ? "Generating..." : "Generate"}
          </button>
        </div>
        <div className="ai-chip-row">
          {focusModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={`ai-chip ${focusMode === mode.id ? "active" : ""}`}
              onClick={() => setFocusMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {!insights ? (
          <p className="muted">Generate AI insights for this resource (PDF/DOCX).</p>
        ) : (
          <>
            <h4>Summary</h4>
            <p>{insights.summary}</p>

            <h4>AI Action Plan</h4>
            <ul>
              {aiActionPlan.map((item) => <li key={item}>{item}</li>)}
            </ul>

            {!studyMode && <><h4>Key Points</h4>
            <ul>
              {insights.keyPoints?.map((point, idx) => <li key={idx}>{point}</li>)}
            </ul>
            </>}

            <h4>Key Concepts</h4>
            <ul>
              {(insights.importantConcepts?.length ? insights.importantConcepts : insights.keyTopics || []).map((concept, idx) => (
                <li key={idx}>{concept}</li>
              ))}
            </ul>

            <h4>Important Questions</h4>
            <ul>
              {insights.revisionQuestions?.map((q, idx) => <li key={idx}>{q}</li>)}
            </ul>

            <h4>Quick Revision Notes</h4>
            <ul>
              {insights.revisionNotes?.map((note, idx) => <li key={idx}>{note}</li>)}
            </ul>

            <h4>AI Flashcards</h4>
            <div className="flash-grid">
              {flashcards.map((item, idx) => (
                <div className="flash-card" key={`${item.q}-${idx}`}>
                  <p className="flash-q">Q: {item.q}</p>
                  <p className="flash-a">A: {item.a}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
