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
