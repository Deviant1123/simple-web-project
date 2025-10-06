// Enables layout('layout') usage by monkey-patching res.render
const ejs = require('ejs');
const path = require('path');

function setupLayouts(app) {
  app.engine('ejs', (filePath, options, callback) => {
    const layout = options.settings && options.settings['view layout'] || 'layout';
    const layoutPath = path.join(options.settings.views, layout + '.ejs');
    ejs.renderFile(filePath, options, (err, str) => {
      if (err) return callback(err);
      const body = str;
      const layoutOptions = Object.assign({}, options, { body });
      ejs.renderFile(layoutPath, layoutOptions, callback);
    });
  });
}

module.exports = { setupLayouts };


