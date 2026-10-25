const service = require('../services/stats.service');

exports.page = (req, res) => res.render('stats/report', {
  title: 'Thống kê',
  report: null
});

exports.report = async (req, res) => {
  const data = await service.getReport({
    mode: req.query.mode,
    from: req.query.from,
    to: req.query.to
  });
  res.json({ success: true, data, errors: [] });
};
