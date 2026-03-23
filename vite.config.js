/** @type {import('vite').UserConfig} */
module.exports = {
  // Pastikan asset output memakai path relatif agar deploy di subfolder lebih aman.
  base: "./",
  server: {
    port: 5173,
  },
};
