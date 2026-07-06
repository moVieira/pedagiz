const db = require('../config/database');

async function follow(userId, creatorId) {
  await db.query(
    'INSERT IGNORE INTO follows (user_id, creator_id) VALUES (?, ?)',
    [userId, creatorId]
  );
}

async function unfollow(userId, creatorId) {
  await db.query('DELETE FROM follows WHERE user_id = ? AND creator_id = ?', [userId, creatorId]);
}

async function isFollowing(userId, creatorId) {
  const [rows] = await db.query(
    'SELECT id FROM follows WHERE user_id = ? AND creator_id = ?',
    [userId, creatorId]
  );
  return rows.length > 0;
}

module.exports = { follow, unfollow, isFollowing };
