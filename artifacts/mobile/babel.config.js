module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // Reticle: stamp data-reticle-source on JSX elements for component → file:line mapping (dev only)
      process.env.NODE_ENV !== "production" && "@reticlehq/babel-plugin",
    ].filter(Boolean),
  };
};
