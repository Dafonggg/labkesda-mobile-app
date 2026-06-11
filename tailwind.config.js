/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Labkesda Design System – from Stitch
        primary: '#006a44',
        'primary-container': '#0b8658',
        'primary-fixed': '#90f7c0',
        'primary-fixed-dim': '#73daa5',
        'on-primary': '#ffffff',
        'on-primary-container': '#fafff9',
        'on-primary-fixed': '#002112',
        'on-primary-fixed-variant': '#005233',
        'inverse-primary': '#73daa5',

        secondary: '#675e42',
        'secondary-container': '#efe2bf',
        'secondary-fixed': '#efe2bf',
        'secondary-fixed-dim': '#d3c6a4',
        'on-secondary': '#ffffff',
        'on-secondary-container': '#6d6448',
        'on-secondary-fixed': '#211b06',
        'on-secondary-fixed-variant': '#4f462d',

        tertiary: '#096a45',
        'tertiary-container': '#2f845d',
        'tertiary-fixed': '#a0f4c5',
        'tertiary-fixed-dim': '#84d7aa',
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#fbfff9',
        'on-tertiary-fixed': '#002112',
        'on-tertiary-fixed-variant': '#005234',

        background: '#fbf9f8',
        surface: '#fbf9f8',
        'surface-dim': '#dcd9d9',
        'surface-bright': '#fbf9f8',
        'surface-container-lowest': '#ffffff',
        'surface-container-low': '#f6f3f2',
        'surface-container': '#f0eded',
        'surface-container-high': '#eae8e7',
        'surface-container-highest': '#e4e2e1',
        'surface-variant': '#e4e2e1',
        'surface-tint': '#006c46',
        'on-surface': '#1b1c1c',
        'on-surface-variant': '#3e4942',
        'on-background': '#1b1c1c',
        'inverse-surface': '#303030',
        'inverse-on-surface': '#f3f0f0',

        outline: '#6e7a71',
        'outline-variant': '#bdcabf',

        error: '#ba1a1a',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        // App-specific
        'cream-bg': '#FFFCF5',
        'status-success': '#16A34A',
        'status-warning': '#F59E0B',
        'status-danger': '#DC2626',
        'status-info': '#2563EB',
        'gray-100': '#F5F5F5',
        'gray-200': '#E5E5E5',
        'gray-400': '#A3A3A3',
        'gray-700': '#404040',
      },
      fontFamily: {
        poppins: ['Poppins_600SemiBold', 'Poppins_700Bold'],
        inter: ['Inter_400Regular', 'Inter_500Medium', 'Inter_600SemiBold'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
    },
  },
  plugins: [],
};
