import js from "@eslint/js";
import prettier from "eslint-config-prettier";

export default [
    js.configs.recommended,
    prettier,
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                process: "readonly",
                console: "readonly",
                Buffer: "readonly",
                __dirname: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                require: "readonly",
                module: "readonly",
                AbortController: "readonly",
            },
        },
        rules: {
            semi: "error",
            eqeqeq: "error",
            "no-const-assign": "warn",
            "no-this-before-super": "warn",
            "no-undef": "warn",
            "no-unreachable": "warn",
            "no-unused-vars": [
                "warn",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
            "constructor-super": "warn",
            "valid-typeof": "warn",
        },
    },
];
