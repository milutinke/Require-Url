# Require-Url

A simple NPM module which enables you to require modules via URL and to install the dependencies from the remote package.json

Note: It does not include other files recursively, it is useful for one file scripts

## Installation

```
npm i url-require --save
```

## Test

```
npm run test
```

## Examples

```javascript
const Path = require("path");

const UrlRequire_Configuration = {
  // Path where the cached modules are stored
  CACHE_PATH: Path.join(process.cwd(), "cached_modules"),

  // When does the cache expire (In seconds)
  CACHE_EXPIRATION: 86400, // 1 day

  // Path to the package.json in your project
  PACKAGE_JSON: Path.join(process.cwd(), "package.json"),

  // Suppress annoying messages when installing dependencies from the remote package.json (Optional)
  SUPPRESS_MESSAGES: false,
};

// If the configuration object is not provided, the default config will be used
const UrlRequire = new (require("url-require"))(UrlRequire_Configuration);

// Top level async function is needed since we are doing async operations under the hood
(async () => {
  try {
    // Install the dependencies from the remote package.json
    // The first parameter is a URL
    // The second parameter can be: UrlRequire.REQUIRE_DEPENDENCIES, UrlRequire.REQUIRE_DEV_DEPENDENCIES and UrlRequire.REQUIRE_BOTH
    await UrlRequire.installFromRemotePackageJSON(
      "https://unpkg.com/valid-url@1.0.9/package.json",
      UrlRequire.REQUIRE_BOTH
    );

    // Load valid-url package
    const UrlValidator = await UrlRequire.from(
      "https://unpkg.com/valid-url@1.0.9/index.js"
    );

    const URL = "http://www.google.com/";
    console.log(
      `URL: ${URL} is ${UrlValidator.isUri(URL) ? "valid ✔️" : "invalid ❌"}!`
    );
  } catch (error) {
    // Something has gone wrong !
    throw error;
  }
})();
```

```javascript
const Path = require("path");
const Colors = require("colors");

const UrlRequire = new (require("../index"))({
  CACHE_PATH: Path.join(process.cwd(), "cached_modules"),
  CACHE_EXPIRATION: 86400,
  PACKAGE_JSON: Path.join(process.cwd(), "..", "package.json"),
  SUPPRESS_MESSAGES: true,
});

(async () => {
  try {
    await UrlRequire.installFromRemotePackageJSON(
      "https://unpkg.com/valid-url@1.0.9/package.json",
      UrlRequire.REQUIRE_BOTH
    );
    console.log(
      "Test: UrlRequire.installFromRemotePackageJSON - Passed! ✔️".green
    );
  } catch (error) {
    console.log(
      "Test: UrlRequire.installFromRemotePackageJSON - Failed! ❌".red
    );
  }

  try {
    const UrlValidator = await UrlRequire.from(
      "https://unpkg.com/valid-url@1.0.9/index.js"
    );

    if (UrlValidator !== undefined)
      console.log("Test: UrlRequire.from - Passed! ✔️".green);
    else console.log("Test: UrlRequire.from - Failed! ❌".red);

    const URL = "http://www.google.com/";
    console.log(
      `URL: ${URL} is ${UrlValidator.isUri(URL) ? "valid ✔️" : "invalid ❌"}!`
        .green
    );
  } catch (error) {
    console.log("Test: UrlRequire.from - Failed! ❌".red);
  }
})();
```
