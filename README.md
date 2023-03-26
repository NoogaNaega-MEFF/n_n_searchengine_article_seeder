# NoogaNaega Web Scraper Scheduler
This the web scraper that scrapes from a website of you choosing, then compresses and insert data into ipfs. <br/>
Before running project get an api key from ipfs and start a mongodb database(optional)
- https://web3.storage/
- https://www.mongodb.com/

Then create a <code>.env</code> file and define these variables

            
    SEEDER_URL = the  url your are scraping from
    MONGODB_USER = Mongodb shared cluster user
    MONGODB_PWD = Mongodb shared cluster password
    MONGODB_URL = Mongodb shared cluster url
    WEB3STORAGE_API_KEY = Web3.storage api key

### Process
1. Scrape data from a search engine or website using <code>nightmare</code>
2. Have common keywords in the database, loop through them
3. For each one pass a query with website of your choosing(<code>process.env.SEEDER_URL</code>) 
4. Search website on that keyword, get's <code>title, description,</code> and <code>link</code>. 
5. After getting the results of each keyword, compress results using <code>pako</code> npm library.
6. Use compressed results and write it to the <code>data.json</code> file.
7. Then Use <code>web3.storage</code> utility function to get file contents(this is optional, you could probably use <code>fs</code> instead)
8. Insert into **web3.storage** a decentralized data layer to ipfs.
9. Keep the resulting ipfs <code>cid, url,</code> and <code>date</code> when the data was added to ipfs.

### Extra
1. The function <code>readFileFromWeb3Storage</code> is how you would read data from **web3.storage**.