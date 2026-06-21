import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const authService = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
};

export const financeService = {
  getStats: () => api.get('/dashboard/stats'),
  getExpenses: () => api.get('/expenses/'),
  addExpense: (data) => api.post('/expenses/', data),
  deleteExpense: (id) => api.delete(`/expenses/${id}`),
  getIncome: () => api.get('/income/'),
  addIncome: (data) => api.post('/income/', data),
  deleteIncome: (id) => api.delete(`/income/${id}`),
};

export default api;
