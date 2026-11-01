const asyncHandler = require('../utils/async-handler');
const env = require('../config/env');
const homeService = env.USE_MOCK ? require('../services/mock-home.service') : require('../services/home.service');

// Render home/dashboard page with news list
exports.renderHome = asyncHandler(async (req, res) => {
  const newsList = await homeService.getNews();
  res.render('home/home', { title: 'Trang chủ', news: newsList });
});
const homeService = require('../services/home.service');

async function renderHome(req, res) {
  const data = await homeService.getHomeData();
  if (req.session.user.role === 'CUSTOMER') {
    return res.render('customer/home', {
      title: 'Trang chủ',
      ...data
    });
  }
  return res.render('home/dashboard', {
    title: 'Tổng quan vận hành',
    ...data
  });
}

async function renderNews(_req, res) {
  const data = await homeService.getNewsData();
  return res.render('home/news', { title: 'Tin tức bãi đỗ xe', ...data });
}

module.exports = { renderHome, renderNews };
