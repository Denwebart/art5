const prettier = require('prettier');
const { eleventyImageTransformPlugin } = require('@11ty/eleventy-img');
const path = require('path');

module.exports = function (eleventyConfig) {
  // This is the core of the setup.
  // The plugin will find all `<img>` tags in your HTML output and process them.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    // The file extensions to process.
    extensions: 'html',

    // The output formats to generate. `auto` means the original format.
    formats: ['avif', 'webp', 'auto'],

    // A default set of widths to generate for responsive images.
    // Can be overridden per-image with the `eleventy:widths` attribute.
    widths: [320, 480, 640, 768, 1024, 1280, 1536, 1920, 2560, null], // `null` means original width

    // Default attributes to add to the generated `<img>` tag.
    defaultAttributes: {
      loading: 'lazy',
      decoding: 'async',
    },

    // Advanced optimization settings to prevent files from getting larger.
    transformOptions: {
      sharpOptions: { animated: true },
      sharpPngOptions: { quality: 80, compressionLevel: 9, force: false },
      sharpJpegOptions: { quality: 85, force: false },
      sharpWebpOptions: { quality: 80, force: false },
      sharpAvifOptions: { quality: 50, force: false },
    },

    // The output directory for the generated images.
    outputDir: path.join('_site', 'images'),

    // The URL path to use in the `src` attribute.
    urlPath: 'images/',

    // --- CORRECTED FILENAME FORMAT FUNCTION ---
    filenameFormat: (id, src, width, format) => {
      // Get the path to the image relative to the project root.
      const relativePath = path.relative(__dirname, src);
      // Get the subdirectory path, if any, relative to the `src/images` folder.
      const subDir = path.dirname(path.relative('src/images', relativePath));
      // Get the filename without the extension.
      const name = path.basename(relativePath, path.extname(relativePath));

      // Reconstruct the path with the subdirectory.
      // path.join correctly handles cases where `subDir` is '.' (the root).
      const newPath = path.join(subDir, `${name}-${width}.${format}`);
      // On Windows, path.join uses backslashes, so we replace them with forward slashes for web URLs.
      return newPath.replace(/\\/g, '/');
    },
  });

  eleventyConfig.addTransform('prettier', function (content, outputPath) {
    if (outputPath && outputPath.endsWith('.html')) {
      return prettier.format(content, { parser: 'html' });
    }
    return content;
  });

  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy('src/js');
  eleventyConfig.addPassthroughCopy('src/fonts');
  eleventyConfig.addPassthroughCopy('src/images');

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
    },
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
  };
};
