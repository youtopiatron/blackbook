const yaml = require("js-yaml");

module.exports = function(eleventyConfig) {
  // Add YAML support for files in _data
  eleventyConfig.addDataExtension("yml, yaml", (contents) => yaml.load(contents));

  // Allow raw SVG / static files to pass through to the built site
  eleventyConfig.addPassthroughCopy("us-counties-base.svg");

  return {
    dir: {
      input: ".",
      output: "_site"
    }
  };
};