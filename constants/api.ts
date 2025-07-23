interface ApiConfig {
  endpoint: string;
}

const api: ApiConfig = {
  endpoint: "https://us-central1-nettrotter-app-dev.cloudfunctions.net/api/dev/"    // PROD
  // endpoint: "https://us-central1-ealloora-dev.cloudfunctions.net/api/d/"           // DEV
};

export default api;