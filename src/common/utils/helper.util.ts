export const toBool = (val: string | boolean) => {
  if (val === undefined) return undefined;
  if (val === true || val === false) return val;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    if (s === '1' || s === 'true') return true;
    if (s === '0' || s === 'false') return false;
  }
  return undefined;
};
