const db = require('../config/db');

// Stub service: fetch news from database (news table). For now return empty array.
exports.getNews = async () => {
  // Example query: SELECT id, title, content, created_at FROM news ORDER BY created_at DESC LIMIT 10;
  // Using pool from db config.
  const [rows] = await db.execute('SELECT id, title, content, created_at FROM news ORDER BY created_at DESC LIMIT 10');
  return rows;
};
const homeModel = require('../models/home.model');

async function getHomeData() {
  const [summary, news] = await Promise.all([
    homeModel.getDashboardSummary(),
    homeModel.listPublishedNews(4)
  ]);
  return { summary, news };
}

async function getNewsData() {
  return { news: await homeModel.listPublishedNews(20) };
}

module.exports = { getHomeData, getNewsData };
