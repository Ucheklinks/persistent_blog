module.exports = {
  content: [
    "./public/**/*.html",               // Scan your HTML files
    "./node_modules/flowbite/**/*.js"   // Include Flowbite JS components
  ],
  theme: {
    extend: {},
  },
  plugins: [
    require('flowbite/plugin')          // Load Flowbite plugin
  ],
};
