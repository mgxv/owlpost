import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/**", "dist-electron/**", "dist-injected/**", "release/**", "node_modules/**"],
    },

    {
        files: ["electron/**/*.ts", "injected/**/*.ts"],
        extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
        languageOptions: {
            globals: { ...globals.node },
            parserOptions: {
                project: ["./tsconfig.preload.json", "./tsconfig.node.json", "./tsconfig.injected.json"],
            },
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-import-type-side-effects": "error",
            "no-console": "error",
            eqeqeq: ["error", "always"],
            "no-return-await": "error",
        },
    },

    {
        // injected scripts are bundled to an IIFE by esbuild, so ES imports between
        // them are fine; /// <reference path> still pulls in ambient window globals.
        files: ["injected/**/*.ts"],
        rules: {
            "@typescript-eslint/triple-slash-reference": ["error", { path: "always" }],
        },
    },

    {
        files: ["src/**/*.{ts,tsx}"],
        extends: [js.configs.recommended, ...tseslint.configs.strictTypeChecked],
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        languageOptions: {
            globals: { ...globals.browser },
            parserOptions: { project: ["./tsconfig.json"] },
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["error", { allowConstantExport: true }],
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/no-misused-promises": "error",
            "@typescript-eslint/await-thenable": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/no-import-type-side-effects": "error",
            "no-console": ["warn", { allow: ["warn", "error"] }],
            eqeqeq: ["error", "always"],
            "react-hooks/exhaustive-deps": "error",
        },
    },
);
