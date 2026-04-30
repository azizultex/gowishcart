import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Determine which entry point to build based on command line argument
const buildTarget = process.env.BUILD_TARGET || 'wishlist-frontend'

let entryPoint;
if (buildTarget === 'admin') {
    entryPoint = path.resolve(__dirname, 'src/admin/index.jsx');
} else {
    entryPoint = path.resolve(__dirname, 'src/frontend/index.jsx');
}

export default defineConfig(({ command }) => ({
    plugins: [react()],
    build: {
        // Public releases: omit source maps (set SOURCE_MAP=true for local debugging of built files).
        sourcemap: process.env.SOURCE_MAP === 'true',
        outDir: 'build',
        emptyOutDir: false,
        cssCodeSplit: false,
        rollupOptions: {
            input: entryPoint,
            output: {
                format: 'iife',
                entryFileNames: `${buildTarget}.js`,
                chunkFileNames: 'chunks/[name].[hash].js',
                assetFileNames: (assetInfo) => {
                    if (assetInfo.name.endsWith('.css')) {
                        return `${buildTarget}.css`
                    }
                    return 'assets/[name].[hash][extname]'
                },
                globals: {
                    '@wordpress/i18n': 'wp.i18n'
                }
            },
            external: [
                '@wordpress/i18n'
            ],
        }
    },
    esbuild: {
        // Quieter production bundles; set VITE_KEEP_CONSOLE=1 when you need console during vite build --watch.
        drop:
            command === 'build' && process.env.VITE_KEEP_CONSOLE !== '1'
                ? ['console', 'debugger']
                : [],
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        }
    }
}))
