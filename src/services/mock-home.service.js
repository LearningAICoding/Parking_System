const { news } = require('../mocks/data');

// Return a shallow copy to avoid accidental mutation
exports.getNews = async () => {
  // Simulate async API
  return new Promise(resolve => {
    setTimeout(() => resolve([...news]), 100);
  });
};
