const { customers } = require('../mocks/data');

// Return a shallow copy of non‑deleted customers
exports.getCustomers = async () => {
  return new Promise(resolve => {
    setTimeout(() => resolve(customers.filter(c => !c.deleted)), 50);
  });
};

exports.searchCustomers = async keyword => {
  const lower = keyword.toLowerCase();
  return new Promise(resolve => {
    setTimeout(() => {
      const results = customers.filter(c => !c.deleted && (
        (c.fullName && c.fullName.toLowerCase().includes(lower)) ||
        (c.phone && c.phone.includes(lower)) ||
        (c.email && c.email.toLowerCase().includes(lower))
      ));
      resolve(results);
    }, 50);
  });
};

exports.softDeleteCustomer = async id => {
  return new Promise((resolve, reject) => {
    const cust = customers.find(c => c.id === Number(id));
    if (!cust) return reject(new Error('Customer not found'));
    cust.deleted = true;
    resolve();
  });
};

exports.updateCustomer = async (id, data) => {
  return new Promise((resolve, reject) => {
    const cust = customers.find(c => c.id === Number(id) && !c.deleted);
    if (!cust) return reject(new Error('Customer not found'));
    Object.assign(cust, data);
    resolve(cust);
  });
};
