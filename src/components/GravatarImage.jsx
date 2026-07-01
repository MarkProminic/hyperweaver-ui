import { useAuth } from '../contexts/AuthContext';

export default function GravatarImage() {
  const { user } = useAuth();

  if (!user || !user.gravatar) {
    return (
      <span
        className="rounded-circle d-inline-block bg-secondary-subtle"
        style={{ width: 32, height: 32 }}
      />
    );
  }

  return (
    <img
      src={`${user.gravatar.avatar_url}?size=32`}
      className="rounded-circle"
      width={32}
      height={32}
      alt="User avatar"
    />
  );
}
