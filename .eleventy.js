module.exports = function (eleventyConfig) {
  // Copy static files to _site
  eleventyConfig.addPassthroughCopy('src/css');
  eleventyConfig.addPassthroughCopy('src/js');
  eleventyConfig.addPassthroughCopy('src/fonts');
  eleventyConfig.addPassthroughCopy('src/images');

  // For network access
  eleventyConfig.setBrowserSyncConfig({
    host: '0.0.0.0',
    open: false, // disable auto-open, since you have dev:open.
  });

  // Folder settings
  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
    },
    // Support for HTML files in _includes
    markdownTemplateEngine: 'njk',
    htmlTemplateEngine: 'njk',
    // Configuring the server to work with the _site folder as the root folder
    serverOptions: {
      domainName: 'localhost',
      port: 8080,
      baseDir: './_site',
    },
  };
};
