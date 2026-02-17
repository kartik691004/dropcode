export default function RatingStars({ rating = 0, count, size = "md" }) {
  const max = 5;
  const rounded = Math.round(rating);

  return (
    <div className={`rating-stars rating-${size}`}>
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={i < rounded ? "star active" : "star"}>?</span>
      ))}
      <span className="rating-text">{rating.toFixed(1)}{count !== undefined ? ` (${count})` : ""}</span>
    </div>
  );
}
