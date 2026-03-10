/**
 * In-memory store for demo real-time feed.
 * Captures recent ML motor-score responses and aggregated batch receipts
 * so the demo dashboard can display them without modifying core logic.
 */

const MAX_ML_ENTRIES = 20;
const MAX_BATCH_ENTRIES = 50;

const mlResponses = [];
const batchReceipts = [];

function addMLResponse({ userId, mlResponse, impairmentSnapshot }) {
  mlResponses.unshift({
    ts: new Date().toISOString(),
    userId: String(userId),
    mlResponse: mlResponse || {},
    impairmentSnapshot: impairmentSnapshot || {},
  });
  if (mlResponses.length > MAX_ML_ENTRIES) mlResponses.pop();
}

function addBatchReceipt({ userId, batchCount, batches }) {
  batchReceipts.unshift({
    ts: new Date().toISOString(),
    userId: String(userId),
    batchCount: batchCount || 0,
    batches: Array.isArray(batches) ? batches.slice(0, 5) : [], // keep first 5 for preview
  });
  if (batchReceipts.length > MAX_BATCH_ENTRIES) batchReceipts.pop();
}

function getFeed() {
  return {
    mlResponses: [...mlResponses],
    batchReceipts: [...batchReceipts],
    _meta: { updatedAt: new Date().toISOString() },
  };
}

module.exports = {
  addMLResponse,
  addBatchReceipt,
  getFeed,
};
