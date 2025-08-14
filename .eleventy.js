const prettier = require('prettier');
const { eleventyImageTransformPlugin } = require('@11ty/eleventy-img');
const path = require('path');

// Function for automatic sizes generation based on Tailwind CSS v4 classes
function generateSizesFromTailwind(classList) {
  if (!classList) return '100vw';

  // Tailwind CSS v4 breakpoints
  const breakpoints = {
    sm: 640,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
  };

  // Parse sizes from Tailwind classes
  const sizePattern =
    /(?:^|\s)((?:sm|md|lg|xl|2xl):)?(?:w-(\d+)|h-(\d+)|size-(\d+)|max-w-(\w+))/g;
  const sizes = [];
  let match;
  let defaultSize = null;

  while ((match = sizePattern.exec(classList)) !== null) {
    const [, prefix, width, height, size, maxWidth] = match;
    const breakpoint = prefix ? prefix.replace(':', '') : null;

    let pixelValue;

    // Convert Tailwind sizes to pixels (1 unit = 4px)
    if (width) {
      pixelValue = parseInt(width) * 4;
    } else if (size) {
      pixelValue = parseInt(size) * 4;
    } else if (maxWidth) {
      // Handle special max-w-* values
      const maxWidthMap = {
        xs: 320,
        sm: 384,
        md: 448,
        lg: 512,
        xl: 576,
        '2xl': 672,
        '3xl': 768,
        '4xl': 896,
        '5xl': 1024,
        '6xl': 1152,
        '7xl': 1280,
        full: '100vw',
        screen: '100vw',
      };
      pixelValue = maxWidthMap[maxWidth] || 320;
    }

    if (breakpoint && breakpoints[breakpoint] && pixelValue) {
      sizes.push({
        breakpoint: breakpoints[breakpoint],
        size: `${pixelValue}px`,
        query: `(min-width: ${breakpoints[breakpoint]}px) ${pixelValue}px`,
      });
    } else if (!breakpoint && pixelValue) {
      defaultSize = `${pixelValue}px`;
    }
  }

  // Sort by descending breakpoints
  sizes.sort((a, b) => b.breakpoint - a.breakpoint);

  // Build final sizes string
  const sizeQueries = sizes.map((s) => s.query);
  if (defaultSize) {
    sizeQueries.push(defaultSize);
  }

  return sizeQueries.length > 0 ? sizeQueries.join(', ') : '100vw';
}

module.exports = function (eleventyConfig) {
  // Main plugin for image processing
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    // Process HTML files
    extensions: 'html',

    // Modern image formats by compression priority
    formats: ['avif', 'webp', 'auto'],

    // Enhanced widths including small sizes for crisp logos
    widths: [
      80, 100, 120, 160, 200, 240, 320, 480, 640, 768, 1024, 1280, 1536, 2048,
    ],

    // Professional quality and compression settings
    // В блоке transformOptions замените на:
    transformOptions: {
      sharpOptions: {
        animated: true,
        stripMetadata: true,
      },
      sharpPngOptions: {
        quality: (metadata, options) => {
          // Максимальное качество для логотипов
          return options.src.includes('/logo/') ? 95 : 90;
        },
        compressionLevel: 9,
        palette: true,
        force: false,
      },
      sharpJpegOptions: {
        quality: (metadata, options) => {
          return options.src.includes('/logo/') ? 98 : 95;
        },
        progressive: true,
        mozjpeg: true,
        force: false,
      },
      sharpWebpOptions: {
        quality: (metadata, options) => {
          // Для логотипов используем почти lossless качество
          return options.src.includes('/logo/') ? 95 : 90;
        },
        effort: 6,
        force: false,
      },
      sharpAvifOptions: {
        quality: (metadata, options) => {
          return options.src.includes('/logo/') ? 90 : 85;
        },
        effort: 6,
        chromaSubsampling: '4:2:0',
        force: false,
      },
    },

    // Automatic attributes for all images
    defaultAttributes: {
      loading: 'lazy',
      decoding: 'async',
      // Automatic sizes generation based on Tailwind classes
      sizes: function (metadata) {
        // Get classList from img tag
        const imgElement = this;
        const classList = imgElement.getAttribute('class');
        return generateSizesFromTailwind(classList);
      },
    },

    // Directory for processed images
    outputDir: path.join('_site', 'images'),

    // URL path for images
    urlPath: 'images/',

    // Filename function preserving folder structure
    filenameFormat: (id, src, width, format) => {
      // Get relative path to image
      const relativePath = path.relative(__dirname, src);
      // Get subdirectory path relative to src/images
      const subDir = path.dirname(path.relative('src/images', relativePath));
      // Get filename without extension
      const name = path.basename(relativePath, path.extname(relativePath));

      // Create new path with subdirectory
      const newPath = path.join(subDir, `${name}-${width}.${format}`);
      // Replace backslashes with forward slashes for web URLs
      return newPath.replace(/\\/g, '/');
    },

    // Additional performance settings
    dryRun: false, // Disable dry run for production
    statsOnly: false, // Generate files, not just statistics
  });

  // HTML formatting with Prettier
  eleventyConfig.addTransform('prettier', function (content, outputPath) {
    if (outputPath && outputPath.endsWith('.html')) {
      try {
        return prettier.format(content, {
          parser: 'html',
          printWidth: 120,
          tabWidth: 2,
          useTabs: false,
        });
      } catch (error) {
        console.warn('Prettier formatting failed:', error.message);
        return content;
      }
    }
    return content;
  });

  // Copy static resources
  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy('src/js');
  eleventyConfig.addPassthroughCopy('src/fonts');
  eleventyConfig.addPassthroughCopy('src/images');

  // Copy additional files
  eleventyConfig.addPassthroughCopy('src/favicon.ico');
  eleventyConfig.addPassthroughCopy('src/robots.txt');
  eleventyConfig.addPassthroughCopy('src/sitemap.xml');

  // Development server settings
  eleventyConfig.setServerOptions({
    port: 8080,
    showAllHosts: true,
  });

  // Main Eleventy configuration
  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      layouts: '_layouts',
      data: '_data',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    templateFormats: ['md', 'njk', 'html'],

    // Performance optimization settings
    pathPrefix: '/', // Change to your base path if needed
  };
};
