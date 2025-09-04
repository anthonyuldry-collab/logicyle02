import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    
    return {
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        
        resolve: {
            alias: {
                '@': '.',
                '@components': './components'
            }
        },
        
        optimizeDeps: {
            include: ['react', 'react-dom', 'frappe-charts', 'chart.js', 'react-chartjs-2'],
            exclude: ['@rollup/rollup-linux-x64-gnu'],
            force: true
        },
        
        build: {
            target: 'es2020',
            minify: 'esbuild',
            sourcemap: false,
            rollupOptions: {
                external: ['@rollup/rollup-linux-x64-gnu'],
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                        charts: ['frappe-charts', 'chart.js', 'react-chartjs-2']
                    }
                },
                onwarn(warning, warn) {
                    // Ignorer les avertissements sur les dépendances natives
                    if (warning.code === 'UNRESOLVED_IMPORT' && 
                        warning.message.includes('@rollup/rollup-linux-x64-gnu')) {
                        return;
                    }
                    warn(warning);
                }
            }
        },
        
        esbuild: {
            jsx: 'automatic'
        },
        
        server: {
            port: 3000,
            host: true
        },
        
        preview: {
            port: 4173,
            host: true
        },
        
        plugins: [react()]
    };
});
