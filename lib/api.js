// API client utilities
import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      Cookies.remove('token');
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  verify: () => api.get('/auth/verify'),
};

// Tournament API
export const tournamentAPI = {
  getAll: (params) => api.get('/tournaments', { params }),
  getById: (id) => api.get(`/tournaments/${id}`),
  create: (formData) => api.post('/tournaments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/tournaments/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/tournaments/${id}`),
  getPlayerInvites: (id) => api.get(`/tournaments/${id}/player-invites`),
  createPlayerInvite: (id, data) => api.post(`/tournaments/${id}/player-invites`, data),
  togglePlayerInvite: (id, inviteId) => api.patch(`/tournaments/${id}/player-invites/${inviteId}/toggle`),
  deletePlayerInvite: (id, inviteId) => api.delete(`/tournaments/${id}/player-invites/${inviteId}`),
  getInviteByToken: (token) => api.get(`/tournaments/player-invites/${token}`),
};

// Team API
export const teamAPI = {
  getAll: (params) => api.get('/teams', { params }),
  getById: (id) => api.get(`/teams/${id}`),
  downloadReport: (tournamentId) =>
    api.get('/teams/download/pdf', {
      params: { tournamentId },
      responseType: 'blob',
    }),
  downloadTeamReport: (teamId, includePrices) =>
    api.get(`/teams/${teamId}/download/pdf`, {
      params: { includePrices },
      responseType: 'blob',
    }),
  create: (formData) => api.post('/teams', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/teams/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/teams/${id}`),
};

// Player API
export const playerAPI = {
  getAll: (params) => api.get('/players', { params }),
  getById: (id) => api.get(`/players/${id}`),
  create: (formData) => api.post('/players', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/players/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/players/${id}`),
  createPublic: (token, formData) => api.post(`/players/public/${token}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  exportToExcel: (params) => api.get('/players/export/excel', {
    params,
    responseType: 'blob',
  }),
};

// Rule API
export const ruleAPI = {
  getByTournament: (tournamentId, params) => api.get(`/rules/tournament/${tournamentId}`, { params }),
  create: (data) => api.post('/rules', data),
  update: (id, data) => api.put(`/rules/${id}`, data),
  delete: (id) => api.delete(`/rules/${id}`),
};

// Auction API
export const auctionAPI = {
  getCurrent: (tournamentId) => api.get('/auction/current', { params: { tournamentId } }),
  getUnsold: (tournamentId) => api.get('/auction/unsold', { params: { tournamentId } }),
  getMaxBids: (tournamentId) => api.get('/auction/max-bids', { params: { tournamentId } }),
  start: (tournamentId) => api.post('/auction/start', { tournamentId }),
  shuffle: (tournamentId) => api.post('/auction/shuffle', { tournamentId }),
  selectPlayer: (tournamentId, playerId) => api.post('/auction/select-player', { tournamentId, playerId }),
  placeBid: (data) => api.post('/auction/bid', data),
  sell: (tournamentId, teamId) => api.post('/auction/sell', { tournamentId, teamId }),
  markUnsold: (tournamentId) => api.post('/auction/mark-unsold', { tournamentId }),
  cancelPlayer: (tournamentId) => api.post('/auction/cancel-player', { tournamentId })
};

export default api;

