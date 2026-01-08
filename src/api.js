// src/api.js — финальная версия для Telegram Mini App

import axios from "axios";

// Базовый URL backend (можно переопределить в .env)
const API_BASE = import.meta.env.VITE_API_URL || "https://backendloyalitysystem.onrender.com";

// Основной экземпляр axios
export const api = axios.create({
  baseURL: API_BASE,  // ← без /api/, если бэкенд не использует префикс (как в твоих urls.py)
  withCredentials: false,
  headers: {
    "Content-Type": "application/json",
  },
});

// === Интерцептор запросов: Bearer + Telegram initData ===
api.interceptors.request.use((config) => {
  // Пропуск авторизации для публичных запросов
  if (config.__noAuth) {
    delete config.headers.Authorization;
    return config;
  }

  // JWT токен
  const token = localStorage.getItem("access");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Telegram initData (для валидации на бэкенде)
  const tgInitData = localStorage.getItem("tg_init_data");
  if (tgInitData) {
    config.headers["X-Telegram-Init-Data"] = tgInitData;
  }

  return config;
});

// === Интерцептор ответов: рефреш токена при 401 ===
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem("refresh");
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE}/token/refresh/`, {
          refresh: refreshToken,
        }, { __noAuth: true });

        localStorage.setItem("access", data.access);
        if (data.refresh) localStorage.setItem("refresh", data.refresh);

        processQueue(null, data.access);
        originalRequest.headers.Authorization = `Bearer ${data.access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ==========================
// === АУТЕНТИФИКАЦИЯ ===
// ==========================
export const loginJWT = (payload) =>
  api.post("/token/", payload, { __noAuth: true });

export const loginBaristaJWT = (payload) =>
  api.post("/barista/login-with-code/", payload, { __noAuth: true });

export const loginBaristaOld = (payload) =>
  api.post("/barista/token/", payload, { __noAuth: true });

export const telegramAuth = () => {
  const initData = localStorage.getItem("tg_init_data");
  if (!initData) return Promise.reject("No Telegram initData");
  return api.post("/telegram-auth/", { init_data: initData }, { __noAuth: true });
};

export const getMe = () => api.get("/me/");

// ==========================
// === ПРОФИЛЬ ===
// ==========================
export const getUserProfile = () => api.get("/user/profile/");
export const updateUserProfile = (payload) => api.patch("/user/profile/", payload);

// ==========================
// === ЛОЯЛЬНОСТЬ ===
// ==========================
export const getLoyaltyStatus = (username) =>
  api.get("/loyalty/status/", { params: { username } });

// НОВЫЕ ФУНКЦИИ — именно их не хватало!
export const getLoyaltyStatusByTelegram = async (username) => {
  try {
    const { data } = await api.get(`/loyalty/status-by-telegram/${username}/`);
    return data;
  } catch (error) {
    throw error.response?.data?.detail || "Ошибка получения статуса";
  }
};

export const addStampByTelegram = async ({ telegram_username, amount = 1 }) => {
  try {
    const { data } = await api.post("/loyalty/add-stamp-by-telegram/", {
      telegram_username,
      amount,
    });
    return data;
  } catch (error) {
    throw error.response?.data?.detail || "Ошибка начисления штампов";
  }
};

export const addStampToUser = (payload) =>
  api.post("/loyalty/add-stamp/", payload);

export const generateLoyaltyCode = () =>
  api.post("/loyalty/generate-code/");

export const redeemLoyaltyCode = ({ code }) =>
  api.post("/loyalty/redeem-code/", { code });

export const checkLoyaltyCode = ({ code }) =>
  api.post("/loyalty/check-code/", { code });

export const resetLoyalty = () => api.post("/loyalty/reset/");

// ==========================
// === РЕГИСТРАЦИЯ ===
// ==========================
export const registerUser = (payload) =>
  api.post("/register/", payload, { __noAuth: true });

export const registerBarista = (payload) =>
  api.post("/barista/register/", payload, { __noAuth: true });

export const baristaVerifyCode = (payload) =>
  api.post("/barista/verify-code/", payload, { __noAuth: true });

// ==========================
// === СМЕНА ПАРОЛЯ ===
// ==========================
export const changePassword = (payload) =>
  api.post("/change_password/", payload);

// ==========================
// === ВЫХОД ===
// ==========================
export const logout = () => {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("tg_init_data");
  localStorage.removeItem("user_type");
  localStorage.removeItem("view_mode");

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

// Главный экспорт (axios instance)
export default api;
