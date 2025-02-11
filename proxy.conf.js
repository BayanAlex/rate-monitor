module.exports = {
  "/proxy/**": {
    target: "https://platform.fintacharts.com",
    secure: false,
    changeOrigin: true,
    logLevel: "debug",
    pathRewrite: {
      "/proxy": ""
    }
  }
};
