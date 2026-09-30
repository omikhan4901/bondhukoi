import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: { antd: ['antd', '@ant-design/icons'], map: ['leaflet', 'react-leaflet'], supabase: ['@supabase/supabase-js'] },
      },
    },
  },
});
