const HARDCODED_USERS = [
  { userId: 'CB_SD_HaroonMirza', email: 'haroon.mirza040602@gmail.com', password: 'password123', id: 'user-1', role: 'user', department: 'Software Development' },
  { userId: 'CB_SD_IbrahimMalik', password: 'password123', id: 'user-2', role: 'user', department: 'Software Development' },
  { userId: 'CB_SD_ZaidBinAsim', email: 'zaidbinasim2197@gmail.com', password: 'password123', id: 'user-3', role: 'user', department: 'Data and Research Analyst' },
  { userId: 'CB_BD_MirzaUzairBaig', password: 'password123', id: 'user-4', role: 'user', department: 'Business Development' },
  { userId: 'CB_CEO_AliZakaria_01', password: 'admin123', id: 'admin-1', role: 'admin', department: 'Admin' }
];

const DEFAULT_JWT_SECRET = 'supersecretkey123';

module.exports = {
  HARDCODED_USERS,
  DEFAULT_JWT_SECRET
};
