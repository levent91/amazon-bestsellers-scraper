const Apify = require('apify');

const { log } = Apify.utils;
const { scrapeDetailsPage } = require('./getItems.js');

Apify.main(async () => {
    const requestQueue = await Apify.openRequestQueue();
    const input = await Apify.getValue('INPUT');
    // Select which domain to scrape
    await requestQueue.addRequest({ url: input.domain });

    const crawler = new Apify.PuppeteerCrawler({
        requestQueue,
        launchPuppeteerOptions: {
            headless: true,
            stealth: true,
            useChrome: true,
            stealthOptions: {
                addPlugins: false,
                emulateWindowFrame: false,
                emulateWebGL: false,
                emulateConsoleDebug: false,
                addLanguage: false,
                hideWebDriver: true,
                hackPermissions: false,
                mockChrome: false,
                mockChromeInIframe: false,
                mockDeviceMemory: false,
            },
        },
        handlePageFunction: async ({ request, page }) => {
            // get and log category name
            const title = await page.title();
            log.info(`Processing: ${title}, URL: ${request.url}`);

            // Enqueue category pages on the Best Sellers homepage
            await Apify.utils.enqueueLinks({
                page,
                requestQueue,
                selector: 'div > ul > ul > li > a',
                transformRequestFunction: (req) => {
                    req.userData.detailPage = true;
                    req.userData.crawlDepth = 1;
                    return req;
                },
            });

            const results = {
                category: title,
                categoryUrl: request.url,
                items: [],
            };

            // Scrape items from a [sub]category page and save
            await scrapeDetailsPage(request, page, results);
        },
        maxRequestsPerCrawl: 0,
        maxRequestRetries: 3,
    });

    await crawler.run();
    log.info('Crawl complete.');
});
