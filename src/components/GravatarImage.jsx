import { useAuth } from '../contexts/AuthContext';

export default function GravatarImage() {
  const { user } = useAuth();

  // No Gravatar (Direct-mode API-key sessions, or users without one) → the brand glyph,
  // never an empty circle. flex-shrink-0 keeps the avatar square in tight flex rows
  // (e.g. the minimized sidebar footer).
  if (!user || !user.gravatar) {
    return (
      <img
        src="/ui/images/hyperweaver-glyph.svg"
        className="flex-shrink-0"
        width={32}
        height={32}
        alt="User avatar"
      />
    );
  }

  return (
    <img
      src={`${user.gravatar.avatar_url}?size=32`}
      className="rounded-circle flex-shrink-0"
      width={32}
      height={32}
      alt="User avatar"
    />
  );
}
