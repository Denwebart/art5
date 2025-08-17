const prettier = require('prettier');
const { eleventyImageTransformPlugin } = require('@11ty/eleventy-img');
const path = require('path');

// Function for automatic sizes generation based on Tailwind CSS v4 classes
function generateSizesFromTailwind(classList) {
  if (!classList) return '100vw';

  // Tailwind CSS v4 breakpoints that match our customPictureFormat breakpoints
  const breakpoints = {
    sm: 640, // matches minWidth: 640
    md: 768, // matches minWidth: 768
    lg: 1024, // matches minWidth: 1024
    xl: 1280, // matches minWidth: 1280
    '2xl': 1536,
  };

  // Parse sizes from Tailwind classes - including all size variants
  const sizePattern =
    /(?:^|\s)((?:sm|md|lg|xl|2xl):)?(?:w-(\d+)|h-(\d+)|size-(\d+)|max-w-(\w+))/g;
  const breakpointSizes = new Map();
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
      breakpointSizes.set(breakpoints[breakpoint], pixelValue);
    } else if (!breakpoint && pixelValue) {
      defaultSize = pixelValue;
    }
  }

  // Build sizes string matching customPictureFormat breakpoints order
  const sizeQueries = [];

  // Sort by descending breakpoints to match media query logic
  const sortedBreakpoints = Array.from(breakpointSizes.entries()).sort(
    (a, b) => b[0] - a[0],
  );

  for (const [bp, size] of sortedBreakpoints) {
    sizeQueries.push(`(min-width: ${bp}px) ${size}px`);
  }

  // Add default size (or use 100vw if none specified)
  if (defaultSize) {
    sizeQueries.push(`${defaultSize}px`);
  } else {
    sizeQueries.push('100vw');
  }

  return sizeQueries.join(', ');
}

module.exports = function (eleventyConfig) {
  // Main plugin for image processing
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    // Process HTML files
    extensions: 'html',

    // Generate AVIF, WebP and original formats
    formats: ['avif', 'webp', 'auto'],

    // Widths optimized for mobile-first with Retina support
    widths: [480, 768, 1024, 1366, 1920, 2560],

    // Optimized quality settings for all formats
    transformOptions: {
      svgAllowUpscale: false,
      sharpOptions: {
        animated: true,
        stripMetadata: true,
        withoutEnlargement: true,
      },
      sharpJpegOptions: {
        quality: 88,
        progressive: true,
        mozjpeg: true,
        force: false,
      },
      sharpWebpOptions: {
        quality: 82,
        effort: 6,
        force: false,
      },
      sharpAvifOptions: {
        quality: 75,
        effort: 6,
        chromaSubsampling: '4:2:0',
        force: false,
      },
    },

    // Custom function to filter widths based on original image size
    widthsCallback: function (src, metadata) {
      const originalWidth =
        metadata.jpeg?.[0]?.width ||
        metadata.png?.[0]?.width ||
        metadata.webp?.[0]?.width;
      if (!originalWidth) return [480, 768, 1024, 1366, 1920, 2560];

      const possibleWidths = [480, 768, 1024, 1366, 1920, 2560];
      return possibleWidths.filter((width) => width <= originalWidth);
    },

    // Default attributes
    defaultAttributes: {
      loading: 'lazy',
      decoding: 'async',
      sizes: function (metadata) {
        const imgElement = this;
        const classList = imgElement.getAttribute('class');
        return generateSizesFromTailwind(classList);
      },
    },

    // Directory for processed images
    outputDir: path.join('_site', 'images'),

    // URL path for images (без ведущего слэша)
    urlPath: 'images/',

    // Custom filename function to match your template
    filenameFormat: (id, src, width, format) => {
      try {
        const relativePath = path.relative(__dirname, src);
        const subDir = path.dirname(path.relative('src/images', relativePath));
        const name = path.basename(relativePath, path.extname(relativePath));

        const filename = `${name}_${width}.${format}`;
        const newPath = subDir !== '.' ? path.join(subDir, filename) : filename;

        return newPath.replace(/\\/g, '/');
      } catch (error) {
        console.warn('Error in filename formatting:', error.message);
        const name = path.basename(src, path.extname(src));
        return `${name}_${width}.${format}`;
      }
    },

    dryRun: false,
    statsOnly: false,
  });

  // Custom transform to replace generated picture elements with our template
  eleventyConfig.addTransform(
    'customPictureFormat',
    async function (content, outputPath) {
      if (outputPath && outputPath.endsWith('.html')) {
        const fs = require('fs');
        const sharp = require('sharp');

        // Создаем промисы для всех замен
        const pictureMatches = [
          ...content.matchAll(/<picture[^>]*>[\s\S]*?<\/picture>/g),
        ];

        for (const match of pictureMatches) {
          const originalMatch = match[0];

          // 🚫 Пропускаем если есть eleventy:ignore
          if (originalMatch.includes('eleventy:ignore')) {
            content = content.replace(
              originalMatch,
              originalMatch.replace(/\s*eleventy:ignore(="")?/g, ''),
            );
            continue;
          }

          // Extract img attributes from the original
          const imgMatch = originalMatch.match(/<img[^>]*>/);
          if (!imgMatch) continue;

          const imgTag = imgMatch[0];

          // Extract individual attributes
          const srcMatch = imgTag.match(/src="([^"]+)"/);
          const altMatch = imgTag.match(/alt="([^"]*)"/);
          const classMatch = imgTag.match(/class="([^"]*)"/);
          const loadingMatch = imgTag.match(/loading="([^"]*)"/);
          const fetchpriorityMatch = imgTag.match(/fetchpriority="([^"]*)"/);
          const decodingMatch = imgTag.match(/decoding="([^"]*)"/);

          if (!srcMatch) continue;

          const src = srcMatch[1];
          const alt = altMatch ? altMatch[1] : '';
          const className = classMatch ? classMatch[1] : '';
          const loading = loadingMatch ? loadingMatch[1] : 'lazy';
          const fetchpriority = fetchpriorityMatch ? fetchpriorityMatch[1] : '';
          const decoding = decodingMatch ? decodingMatch[1] : 'async';

          const srcWithoutLeadingSlash = src.startsWith('/')
            ? src.substring(1)
            : src;
          const originalExt = path
            .extname(srcWithoutLeadingSlash)
            .toLowerCase();
          const baseName = path
            .basename(srcWithoutLeadingSlash, originalExt)
            .replace(/_\d+$/, '');
          const dirName = path.dirname(srcWithoutLeadingSlash);
          const basePathPrefix = dirName !== '.' ? `${dirName}/` : '';

          let fallbackFormat;
          if (originalExt === '.png') {
            fallbackFormat = 'png';
          } else if (originalExt === '.jpg' || originalExt === '.jpeg') {
            fallbackFormat = 'jpeg';
          } else if (originalExt === '.gif') {
            fallbackFormat = 'gif';
          } else {
            // Skip processing for unsupported formats
            continue;
          }

          const allBreakpoints = [
            { minWidth: 1280, width: 2560 }, // xl: breakpoint
            { minWidth: 1024, width: 1920 }, // lg: breakpoint
            { minWidth: 768, width: 1366 }, // md: breakpoint
            { minWidth: 640, width: 1024 }, // sm: breakpoint
            { minWidth: null, width: 480 }, // default (mobile)
          ];

          // Check which files actually exist by looking at different possible widths
          const possibleWidths = [480, 1024, 1366, 1920, 2560];
          const existingWidths = [];

          // Check each possible width
          for (const width of possibleWidths) {
            const testFile = path.join(
              '_site',
              'images',
              `${baseName}_${width}.${fallbackFormat}`,
            );
            if (fs.existsSync(testFile)) {
              existingWidths.push(width);
            }
          }

          // If no files found by width check, try to find any file with the base name
          if (existingWidths.length === 0) {
            try {
              const imagesDir = path.join('_site', 'images');
              if (fs.existsSync(imagesDir)) {
                const files = fs.readdirSync(imagesDir);
                const matchingFiles = files.filter((file) =>
                  file.startsWith(baseName + '_'),
                );

                // Extract widths from matching files
                matchingFiles.forEach((file) => {
                  const widthMatch = file.match(
                    new RegExp(`${baseName}_(\\d+)\\.(png|jpeg|gif|avif|webp)`),
                  );
                  if (widthMatch) {
                    const width = parseInt(widthMatch[1]);
                    if (!existingWidths.includes(width)) {
                      existingWidths.push(width);
                    }
                  }
                });
              }
            } catch (error) {
              console.warn(
                'Error checking for existing image files:',
                error.message,
              );
            }
          }

          // Sort existing widths
          existingWidths.sort((a, b) => b - a);

          // Create breakpoints only for existing widths
          const existingBreakpoints = existingWidths.map((width) => {
            const bp = allBreakpoints.find((b) => b.width === width);
            return bp || { minWidth: null, width };
          });

          let sources = '';
          let fallbackSrc = '';

          // Generate sources only for existing files
          if (existingBreakpoints.length > 0) {
            ['avif', 'webp', fallbackFormat].forEach((format) => {
              existingBreakpoints.forEach((bp) => {
                const filename = `${baseName}_${bp.width}.${format}`;
                const srcset = `${basePathPrefix}${filename}`;
                if (bp.minWidth) {
                  sources += `  <source srcset="${srcset}" media="(min-width: ${bp.minWidth}px)" type="image/${format}" />\n`;
                } else {
                  sources += `  <source srcset="${srcset}" type="image/${format}" />\n`;
                  if (format === fallbackFormat && !fallbackSrc) {
                    fallbackSrc = `${basePathPrefix}${filename}`;
                  }
                }
              });
            });

            // If no fallback was set, use the smallest existing file
            if (!fallbackSrc) {
              const smallestWidth = existingWidths[existingWidths.length - 1];
              fallbackSrc = `${basePathPrefix}${baseName}_${smallestWidth}.${fallbackFormat}`;
            }
          } else {
            // Fallback: if no processed files found, use original source
            fallbackSrc = src;
          }

          let imgAttributes = `src="${fallbackSrc}" alt="${alt}"`;

          // Автоматическое добавление width и height из метаданных
          try {
            const originalImagePath = path.join(
              __dirname,
              'src',
              srcWithoutLeadingSlash,
            );

            if (fs.existsSync(originalImagePath)) {
              const metadata = await sharp(originalImagePath).metadata();
              if (metadata.width && metadata.height) {
                imgAttributes += ` width="${metadata.width}" height="${metadata.height}"`;
              }
            }
          } catch (error) {
            // Если не удалось получить размеры, пробуем из уже обработанных файлов
            try {
              const processedImagePath = path.join(
                '_site',
                'images',
                `${baseName}_${existingWidths[existingWidths.length - 1] || 480}.${fallbackFormat}`,
              );
              if (fs.existsSync(processedImagePath)) {
                const metadata = await sharp(processedImagePath).metadata();
                if (metadata.width && metadata.height) {
                  imgAttributes += ` width="${metadata.width}" height="${metadata.height}"`;
                }
              }
            } catch (innerError) {
              console.warn(
                'Could not determine image dimensions:',
                innerError.message,
              );
            }
          }

          if (className) imgAttributes += ` class="${className}"`;
          if (loading) imgAttributes += ` loading="${loading}"`;
          if (decoding) imgAttributes += ` decoding="${decoding}"`;
          if (fetchpriority)
            imgAttributes += ` fetchpriority="${fetchpriority}"`;

          const newPicture = `<picture>
${sources}  <img ${imgAttributes} />
</picture>`;

          content = content.replace(originalMatch, newPicture);
        }
      }
      return content;
    },
  );

  // HTML formatting with Prettier
  eleventyConfig.addTransform('prettier', function (content, outputPath) {
    if (outputPath && outputPath.endsWith('.html')) {
      try {
        return prettier.format(content, {
          parser: 'html',
          printWidth: 120,
          tabWidth: 2,
          useTabs: false,
          htmlWhitespaceSensitivity: 'css',
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
    port: process.env.PORT || 8080,
    showAllHosts: true,
  });

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
    pathPrefix: '/',
  };
};
