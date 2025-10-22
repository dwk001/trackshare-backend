import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Include .tsx files
      include: '**/*.{jsx,tsx}',
    })
  ],
  
  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@hooks': resolve(__dirname, './src/hooks'),
      '@services': resolve(__dirname, './src/services'),
      '@store': resolve(__dirname, './src/store'),
      '@types': resolve(__dirname, './src/types'),
      '@utils': resolve(__dirname, './src/utils'),
      '@assets': resolve(__dirname, './src/assets'),
    }
  },
  
  // Build configuration
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', 'lucide-react'],
          utils: ['axios', 'dompurify', 'clsx', 'tailwind-merge'],
        }
      }
    },
    // Optimize for production
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      }
    }
  },
  
  // Development server
  server: {
    port: 3000,
    open: true,
    cors: true,
    // Proxy API requests to backend
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  
  // Preview server
  preview: {
    port: 4173,
    open: true
  },
  
  // CSS configuration
  css: {
    postcss: './postcss.config.cjs',
  },
  
  // Environment variables
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'dompurify',
      'zustand',
      'react-query',
      'react-hook-form',
      'react-hot-toast',
      'framer-motion',
      'lucide-react',
    ]
  },
  
  // Test configuration
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  }
})
