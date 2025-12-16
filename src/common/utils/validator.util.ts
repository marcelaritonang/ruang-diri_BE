export const cleanPayload = (payload: Record<string, any>) =>
  Object.fromEntries(
    Object.entries(payload).filter(([_, v]) => v !== undefined),
  );
