export default function GravatarSkeleton() {
  return (
    <div className="gravatar-card skeleton">
      <span className="skeleton__avatar" />
      <span className="skeleton__name" />
      <span className="skeleton__meta" />
      <span className="skeleton__meta" />
      <span className="skeleton__description" />
      <div className="skeleton__network">
        <span className="skeleton__network-item" />
        <span className="skeleton__network-item" />
        <span className="skeleton__network-item" />
        <span className="skeleton__network-item" />
      </div>
    </div>
  );
}
