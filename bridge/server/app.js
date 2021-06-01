const fs = require('fs');
const path = require('path');
const http = require('http');
const logger = require('morgan');
const express = require('express');
const cookieParser = require('cookie-parser');
const {execSync} = require('child_process');
const admZip = require('adm-zip');

const apiRouter = require('./api');

const app = express();
let apiUrl = process.env.API_URL;
let apiToken = process.env.API_TOKEN;
let cliDownloadLink = process.env.CLI_DOWNLOAD_LINK;
let integrationsPageLink = process.env.INTEGRATIONS_PAGE_LINK;
let lookAndFeelUrl = process.env.LOOK_AND_FEEL_URL;

if(!apiToken) {
  console.log("API_TOKEN was not provided. Fetching from kubectl.");
  apiToken = Buffer.from(execSync('kubectl get secret keptn-api-token -n keptn -ojsonpath={.data.keptn-api-token}').toString(), 'base64').toString();
}

if (!cliDownloadLink) {
  console.log("CLI Download Link was not provided, defaulting to github.com/keptn/keptn releases")
  cliDownloadLink = "https://github.com/keptn/keptn/releases";
}

if(!integrationsPageLink) {
  console.log("Integrations page Link was not provided, defaulting to get.keptn.sh/integrations.html")
  integrationsPageLink = "https://get.keptn.sh/integrations.html";
}

function getFiles(dir, files_) {
  files_ = files_ || [];
  var files = fs.readdirSync(dir);
  for (var i in files){
    var name = dir + '/' + files[i];
    files_.push(name);
  }
  return files_;
}

if(lookAndFeelUrl) {
  setTimeout(() => {
    console.log("Downloading custom Look-and-Feel file from", lookAndFeelUrl);

    let bridgeDir = path.join(__dirname, '../dist');
    let destDir = path.join(bridgeDir, '/assets/branding');
    let destFile = path.join(destDir, '/lookandfeel.zip');

    let file = fs.createWriteStream(destFile);
    http.get(lookAndFeelUrl, function(response) {
      response.pipe(file);
      file.on('finish', function() {
        file.close(() => {
          let zip = new admZip(destFile);
          zip.extractAllTo(/*target path*/ destDir, /*overwrite*/ true);
        });
      });
    }).on('error', function(err) {
      fs.unlink(destFile);
    });
  }, 90000);
}

const oneWeek = 7 * 24 * 3600000;    // 3600000msec == 1hour

module.exports = (async function (){
  app.use('/dir', (req, resp, next) => {
    let bridgeDir = path.join(__dirname, '../dist');
    let destDir = path.join(bridgeDir, '/assets/branding');
    let destFile = path.join(destDir, '/lookandfeel.zip');
    return resp.status(200).send({
      bridgeDir,
      destDir,
      destFile,
      bridgeFiles: getFiles(bridgeDir),
      brandingFiles: getFiles(destDir),
      clientFiles: getFiles(path.join(__dirname, '../client')),
      rootFiles: getFiles(path.join(__dirname, '../')),
      serverFiles: getFiles(__dirname)
    });
  });

  // server static files - Images & CSS
  app.use('/static', express.static(path.join(__dirname, 'views/static'), {maxAge: oneWeek}));

  // UI static files - Angular application
  app.use(express.static(path.join(__dirname, '../dist'), {
    maxAge: oneWeek, // cache files for one week
    etag: true, // Just being explicit about the default.
    lastModified: true,  // Just being explicit about the default.
    setHeaders: (res, path) => {
      // however, do not cache .html files (e.g., index.html)
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })
  );

  // Server views based on Pug
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');

  // add some middlewares
  app.use(logger('dev'));
  app.use(express.json());
  app.use(express.urlencoded({extended: false}));
  app.use(cookieParser());

  let authType;

  if (process.env.OAUTH_ENABLED === 'true') {
    const sessionRouter = require('./user/session')(app);
    const oauthRouter = await require('./user/oauth');
    const authCheck = require('./user/session').isAuthenticated;

    authType = 'OAUTH';

    // Initialise session middleware
    app.use(sessionRouter);
    // Initializing OAuth middleware.
    app.use(oauthRouter);

    // Authentication filter for API requests
    app.use('/api', (req, resp, next) => {
      if (!authCheck(req)) {
        resp.status(401).send('Unauthorized');
        return;
      }
      return next();
    });

  } else if (process.env.BASIC_AUTH_USERNAME && process.env.BASIC_AUTH_PASSWORD) {
    authType = 'BASIC';

    console.error("Installing Basic authentication - please check environment variables!");
    app.use((req, res, next) => {
      // parse login and password from headers
      const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

      // Verify login and password are set and correct
      if (!(login && password && login === process.env.BASIC_AUTH_USERNAME && password === process.env.BASIC_AUTH_PASSWORD)) {
        // Access denied
        console.error("Access denied");
        res.set('WWW-Authenticate', 'Basic realm="Keptn"');
        res.status(401).send('Authentication required.'); // custom message
        return;
      }

      // Access granted
      return next();
    });
  } else {
    authType = 'NONE';
    console.error("Not installing authentication middleware");
  }


// everything starting with /api is routed to the api implementation
  app.use('/api', apiRouter({apiUrl, apiToken, cliDownloadLink, integrationsPageLink, authType}));

// fallback: go to index.html
  app.use((req, res, next) => {
    console.error("Not found: " + req.url);
    res.sendFile(path.join(`${__dirname}/../dist/index.html`), {maxAge: 0});
  });

// error handler
// eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    // render the error page
    res.status(err.status || 500).send();
    console.error(err);
    // res.json(err);
  });

  return app;
})();

