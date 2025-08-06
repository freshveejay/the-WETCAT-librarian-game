export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        Image: "readonly",
        Audio: "readonly",
        performance: "readonly",
        navigator: "readonly",
        location: "readonly",
        fetch: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        HTMLImageElement: "readonly",
        HTMLAudioElement: "readonly",
        HTMLElement: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-undef": "error",
      "no-console": "off",
      "semi": ["error", "always"],
      "quotes": ["error", "single", { "avoidEscape": true }],
      "indent": ["error", 2],
      "no-trailing-spaces": "error",
      "comma-dangle": ["error", "never"],
      "no-multiple-empty-lines": ["error", { "max": 1 }]
    }
  }
];