/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./app/**/*.{js,jsx,ts,tsx}",
        "./src/**/*.{js,jsx,ts,tsx}",
    ],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                void: '#0F1115',
                fog: '#F2F4F6',
                signal: '#2E5CFF',
                mint: '#00E096',
                glass: 'rgba(255, 255, 255, 0.05)',
                'glass-border': 'rgba(255, 255, 255, 0.1)',
                rose: '#F472B6',
            },
        },
    },
    plugins: [],
};
