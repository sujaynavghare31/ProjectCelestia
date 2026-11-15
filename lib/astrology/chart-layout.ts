const INLINE_HOUSE_BODY_LIMIT = 4;

export function splitHouseBodies<T>(bodies: readonly T[]) {
  return {
    inline: bodies.slice(0, INLINE_HOUSE_BODY_LIMIT),
    overflow: bodies.slice(INLINE_HOUSE_BODY_LIMIT),
  };
}
