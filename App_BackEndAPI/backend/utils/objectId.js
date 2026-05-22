export const idsEqual = (left, right) =>
  left?.toString?.() === right?.toString?.();

export const includesId = (items = [], id) =>
  items.some((item) => idsEqual(item, id));

export const uniqueIds = (items = []) =>
  Array.from(new Set(items.filter(Boolean).map((item) => item.toString())));
