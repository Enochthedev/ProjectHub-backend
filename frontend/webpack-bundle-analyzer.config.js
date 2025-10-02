const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
    webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
        // Only run bundle analyzer in production build when ANALYZE=true
        if (!dev && process.env.ANALYZE === 'true') {
            config.plugins.push(
                new BundleAnalyzerPlugin({
                    analyzerMode: 'static',
                    reportFilename: isServer ? '../analyze/server.html' : './analyze/client.html',
                    openAnalyzer: false,
                    generateStatsFile: true,
                    statsFilename: isServer ? '../analyze/server-stats.json' : './analyze/client-stats.json',
                })
            );
        }

        // Optimize bundle splitting
        if (!dev && !isServer) {
            config.optimization.splitChunks = {
                chunks: 'all',
                cacheGroups: {
                    // Vendor libraries
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        priority: 10,
                        reuseExistingChunk: true,
                    },
                    // React and React DOM
                    react: {
                        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                        name: 'react',
                        priority: 20,
                        reuseExistingChunk: true,
                    },
                    // UI libraries
                    ui: {
                        test: /[\\/]node_modules[\\/](@headlessui|@heroicons|lucide-react)[\\/]/,
                        name: 'ui-libs',
                        priority: 15,
                        reuseExistingChunk: true,
                    },
                    // Common chunks
                    common: {
                        name: 'common',
                        minChunks: 2,
                        priority: 5,
                        reuseExistingChunk: true,
                    },
                },
            };

            // Tree shaking optimization
            config.optimization.usedExports = true;
            config.optimization.sideEffects = false;
        }

        // Analyze bundle composition
        if (process.env.BUNDLE_ANALYZE === 'true') {
            const originalEntry = config.entry;
            config.entry = async () => {
                const entries = await originalEntry();

                // Add bundle analyzer entry
                if (entries['main.js'] && !entries['main.js'].includes('./bundle-analyzer.js')) {
                    entries['main.js'].unshift('./bundle-analyzer.js');
                }

                return entries;
            };
        }

        return config;
    },
};