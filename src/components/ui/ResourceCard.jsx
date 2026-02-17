import { Link } from "react-router-dom";
import RatingStars from "./RatingStars";

export default function ResourceCard({ resource }) {
  const hasFile = Boolean(resource.fileUrl);

  return (
    <article className="resource-card">
      <div className="resource-head">
        <h3>{resource.title}</h3>
        <span className={`pill ${resource.privacy === "private" ? "pill-private" : "pill-public"}`}>
          {resource.privacy}
        </span>
      </div>
      <p>{resource.subject} | Sem {resource.semester} | {resource.type} | {resource.branch}</p>
      <p className="muted">{resource.description}</p>
      <RatingStars rating={resource.avgRating} count={resource.ratingsCount} />
      <div className="inline-row" style={{ marginTop: "0.35rem" }}>
        <Link to={`/resources/${resource.id}`} state={{ resource }} className="btn-link">View Details</Link>
        {hasFile && (
          <a href={resource.fileUrl} target="_blank" rel="noreferrer" className="btn-link">Open File</a>
        )}
      </div>
    </article>
  );
}
