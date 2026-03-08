// .env-like runtime configuration for the extension
// Keep all URL values centralized in this file.
(function initExtensionEnv(globalScope) {
  // =========================
  // Edit only these base URLs
  // =========================
  const API_BASE_URL = "https://extension-backend-theta.vercel.app/api";
  const ONBOARDING_GAME_BASE_URL = "https://onboarding-frontend-psi.vercel.app";
  const ML_BASE_URL = "https://aura-ml-backend-production-bdd3.up.railway.app";

  const URL_ENV = {
    API_BASE_URL,
    ONBOARDING_GAME_URL: ONBOARDING_GAME_BASE_URL,
    ML_PROFILE_API_URL: `${ML_BASE_URL}/data/current-profile`,
    IMPAIRMENT_TO_ML_PROFILE_API_URL: `${ML_BASE_URL}/category/generate-profile`,
  };

  const existing = globalScope.EXTENSION_ENV || {};
  globalScope.EXTENSION_ENV = { ...existing, ...URL_ENV };
})(typeof globalThis !== "undefined" ? globalThis : window);
