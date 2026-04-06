const path = require('path');
const fs = require('fs');
const os = require('os');
const AppDatabase = require('../../database');

/**
 * Creates a fresh AppDatabase instance backed by a temp directory.
 * Each test gets its own DB file, preventing cross-test contamination.
 */
async function createTestDb() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lifedash-test-'));
  const db = new AppDatabase();
  await db.initialize(tmpDir);
  return { db, tmpDir };
}

/**
 * Cleans up the temp directory after tests.
 */
function cleanupTestDb(tmpDir) {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
}

module.exports = { createTestDb, cleanupTestDb };
