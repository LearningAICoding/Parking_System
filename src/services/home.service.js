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
