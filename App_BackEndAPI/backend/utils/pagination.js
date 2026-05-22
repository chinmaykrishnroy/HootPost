export const parsePagination = (query = {}, { defaultLimit = 30, maxLimit = 100 } = {}) => {
  const requestedLimit = Number(query.limit);
  const limit = Math.min(
    Math.max(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : defaultLimit, 1),
    maxLimit
  );
  const cursor = query.before ? new Date(query.before) : null;
  return {
    limit,
    before: cursor && !Number.isNaN(cursor.getTime()) ? cursor : null,
    paginated: query.paginated === "true" || query.page === "true",
  };
};

export const pageFromItems = (items, limit, cursorKey = "createdAt") => {
  const hasMore = items.length > limit;
  const pageItems = hasMore ? items.slice(0, limit) : items;
  const last = pageItems.at(-1);
  return {
    items: pageItems,
    nextCursor: hasMore && last?.[cursorKey] ? last[cursorKey] : null,
    hasMore,
  };
};
