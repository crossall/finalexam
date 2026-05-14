/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102033',
        sand: '#f7efe5',
        coral: '#e27b5b',
        mist: '#e7f1ff',
        pine: '#19443c'
      },
      boxShadow: {
        float: '0 24px 60px -24px rgba(15, 23, 42, 0.45)'
      }
    }
  },
  plugins: []
};

