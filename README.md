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

## Usage

```javascript
const UrlRequire_Configuration = {
  // Path where the cached modules are stored
  CACHE_PATH: Path.join(process.cwd(), "cached_modules"),

  // When does the cache expire (In seconds)
  CACHE_EXPIRATION: 86400, // 1 day

  // Path to the package.json in your project
  PACKAGE_JSON: Path.join(process.cwd(), "..", "package.json"),

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
