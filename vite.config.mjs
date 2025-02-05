import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { ViteEjsPlugin } from 'vite-plugin-ejs';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Функция для удаления пустых строк
function removeEmptyLines(content) {
  return content.replace(/^\s*[\r\n]/gm, '');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    // Плагин для удаления пустых строк из сгенерированного HTML
    {
      name: 'remove-empty-lines',
      enforce: 'post',
      transformIndexHtml(html) {
        return removeEmptyLines(html); // Удаление пустых строк из HTML
      }
    },
    ViteEjsPlugin(),
    viteStaticCopy({
      targets: [
        // Копируем папку fonts из assets в корень dist
        { src: 'fonts', dest: '' },
        { src: 'images', dest: '' },
        { src: 'js', dest: '' }
      ]
    }),
    tailwindcss(),
    // Плагин для исключения шрифтов из бандла (Rollup не должен генерировать файлы шрифтов)
    {
      name: 'exclude-fonts-from-bundle',
      generateBundle(options, bundle) {
        for (const fileName in bundle) {
          if (fileName.endsWith('.woff') || fileName.endsWith('.woff2')) {
            delete bundle[fileName];
          }
        }
      }
    }
  ],
  base: './',
  root: 'assets',
  css: {
    postcss: './postcss.config.js'
  },
  build: {
    emptyOutDir: true,
    outDir: '../dist',
    assetsDir: '',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'css/style.css';
          }
          if (assetInfo.name && /\.(woff2?)$/.test(assetInfo.name)) {
            return 'fonts/Nunito/[name][extname]';
          }
          return '[name][extname]';
        }
      }
    },
    assetsInlineLimit: 0 // Убедимся, что файлы не инлайнятся
  },
  // Ограничиваем набор ассетов, которые Vite должен обрабатывать, исключая шрифты
  assetsInclude: [/\.svg$/, /\.png$/, /\.jpe?g$/, /\.gif$/]
});
