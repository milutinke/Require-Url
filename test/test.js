const Path = require('path');
const Colors = require('colors');

const UrlRequire = new (require('../index'))({
    CACHE_PATH: Path.join(process.cwd(), 'cached_modules'),
    CACHE_EXPIRATION: 86400,
    PACKAGE_JSON: Path.join(process.cwd(), '..', 'package.json'),
    SUPPRESS_MESSAGES: true
});


(async () => {
    try {
        await UrlRequire.installFromRemotePackageJSON('https://unpkg.com/valid-url@1.0.9/package.json', UrlRequire.REQUIRE_BOTH);
        console.log('Test: UrlRequire.installFromRemotePackageJSON - Passed! ✔️'.green);
    } catch (error) {
        console.log('Test: UrlRequire.installFromRemotePackageJSON - Failed! ❌'.red);
    }

    try {
        const UrlValidator = await UrlRequire.from('https://unpkg.com/valid-url@1.0.9/index.js');

        if (UrlValidator !== undefined)
            console.log('Test: UrlRequire.from - Passed! ✔️'.green);
        else console.log('Test: UrlRequire.from - Failed! ❌'.red);

        const URL = 'http://www.google.com/';
        console.log(`URL: ${URL} is ${UrlValidator.isUri(URL) ? 'valid ✔️' : 'invalid ❌'}!`.green);
    } catch (error) {
        console.log('Test: UrlRequire.from - Failed! ❌'.red);
    }
})();