/**
 * In-memory store for demo real-time feed.
 * Captures recent ML motor-score responses used to generate impairment profiles.
 */

const MAX_ML_ENTRIES = 20;

const mlResponses = [];

function addMLResponse({ userId, mlResponse, impairmentSnapshot }) {
  mlResponses.unshift({
    ts: new Date().toISOString(),
    userId: String(userId),
    mlResponse: mlResponse || {},
    impairmentSnapshot: impairmentSnapshot || {},
  });
  if (mlResponses.length > MAX_ML_ENTRIES) mlResponses.pop();
}

function getFeed(userId) {
  const filtered = userId
    ? mlResponses.filter(r => String(r.userId) === String(userId))
    : mlResponses;
  return {
    mlResponses: filtered,
    _meta: { updatedAt: new Date().toISOString() },
  };
}

module.exports = {
  addMLResponse,
  getFeed,
};
