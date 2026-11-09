/**
 * @file UserAvatar.tsx
 * @description Web: el ícono del usuario, igual en toda la web. La foto de Google en un círculo o, si no hay
 * foto o no carga, un círculo naranja con sus iniciales.
 */

import { useState } from 'react';

export default function UserAvatar({ avatar, initials, size = 34 }: { avatar?: string; initials?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };
  if (avatar && !failed) {
    return <img src={avatar} alt="" style={box} className="rounded-full object-cover flex-shrink-0" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  }
  return (
    <span data-testid="user-initials" style={box} className="rounded-full bg-accent text-on-accent text-sm font-semibold grid place-items-center flex-shrink-0">
      {initials ?? '?'}
    </span>
  );
}
