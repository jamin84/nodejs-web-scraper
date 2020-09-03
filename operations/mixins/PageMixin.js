const request = require('../../request/request.js');
const { stripTags } = require('../../utils/html');
const ScrapingObject = require('../../ScrapingObject')


/**
 * @mixin
 */
const PageMixin = {
    

    paginate:async function(scrapingObject) {//Divides a given page to multiple pages.
        
        delete scrapingObject.successful;
        const scrapingObjects = [];
        const numPages = this.pagination.numPages;
        const firstPage = typeof this.pagination.begin !== 'undefined' ? this.pagination.begin : 1;
        const lastPage = this.pagination.end || numPages;
        const offset = this.pagination.offset || 1;

        for (let i = firstPage; i <= lastPage; i = i + offset) {

            const mark = scrapingObject.address.includes('?') ? '&' : '?';
            var paginationUrl;
            var paginationObject;
            // debugger;
            if (this.pagination.queryString) {
                paginationUrl = `${scrapingObject.address}${mark}${this.pagination.queryString}=${i}`;
            } else {

                paginationUrl = `${scrapingObject.address}/${this.pagination.routingString}/${i}`.replace(/([^:]\/)\/+/g, "$1");


            }
            if (this.pagination.processPaginationUrl) {
                try {
                    paginationUrl = await this.pagination.processPaginationUrl(paginationUrl)
                    // console.log('new href', url)
                } catch (error) {

                    console.error('Error processing URL, continuing with original one: ', paginationUrl);

                }

            }
            // paginationObject = this.createScrapingObject(paginationUrl);
            paginationObject = new ScrapingObject(paginationUrl,null,this.referenceToOperationObject.bind(this));
            this.scraper.state.scrapingObjects.push(scrapingObject)
            scrapingObjects.push(paginationObject);

        }

        scrapingObject.data = [...scrapingObjects];
        await this.executeScrapingObjects(scrapingObjects, 3);//The argument 3 forces lower promise limitation on pagination.
    },
    getPage:async function(href) {//Fetches the html of a given page.

        const promiseFactory = async () => {

            await this.beforePromiseFactory('Opening page:' + href);

            let resp;
            try {

                resp = await request({
                    method: 'get', url: href,
                    timeout: this.scraper.config.timeout,
                    auth: this.scraper.config.auth,
                    headers: this.scraper.config.headers,
                    proxy: this.scraper.config.proxy

                })
                if (this.scraper.config.removeStyleAndScriptTags) {
                    resp.data = stripTags(resp.data);
                }

                if (this.getHtml) {
                    await this.getHtml(resp.data, resp.url)
                }

            } catch (error) {
                // debugger;
                throw error;
            }
            finally {
                this.afterPromiseFactory();
            }
            return resp;
        }

        return await this.qyuFactory(() => this.repeatPromiseUntilResolved(promiseFactory, href));
    }
};


module.exports = PageMixin;