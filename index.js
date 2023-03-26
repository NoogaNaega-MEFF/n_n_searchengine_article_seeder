import dotenv from "dotenv";
dotenv.config();
import { MongoClient, ServerApiVersion } from "mongodb";
import Nightmare from "nightmare";
import { Web3Storage, getFilesFromPath } from "web3.storage";
import fs from "fs";
import pako from 'pako';

const url = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PWD}@${process.env.MONGODB_URL}`;
const client = new MongoClient(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const n_nDb = client.db("nooganaega");
const keywordsTable = n_nDb.collection("keywords");
const ipfsHashesTable = n_nDb.collection("ipfs-hashes");

async function addDataToIPFS(data) {
  const compressedData = pako.deflate(data, { to: 'string' });
  fs.writeFileSync("./data.json", compressedData);
  try {
    const web3StorageClient = new Web3Storage({
      token: process.env.WEB3STORAGE_API_KEY,
    });

    const files = await getFilesFromPath("./data.json");
    const cid = await web3StorageClient.put(files, { wrapWithDirectory: false });
    console.log("cid:", cid);
    const url = `https://ipfs.io/ipfs/${cid}/data.json`;
    console.log("url:", url);
    await ipfsHashesTable.insertOne({
      hash: cid,
      url: url,
      date: new Date().toISOString(),
    });

    return url;
  } catch (error) {
    console.error("Error adding data to IPFS:", error);
    return null;
  }
}

async function getArticles(keyword) {
  const nightmare = Nightmare({ show: true });
  const keywords = keyword.replace(" ", "+");
  await nightmare.goto(
    `${process.env.SEEDER_URL}${keywords}&t=h_&df=w&iar=news&ia=news`
  );

  const linksAndTitle = await nightmare.wait(1000).evaluate(() => {
    const aElements = document.querySelectorAll(".result__body > h2 > a");
    let results = [];
    console.log("aElements:", aElements);
    for (let i = 0; i < aElements.length; i++) {
      let aElem = aElements[i];
      results.push({
        link: aElem.getAttribute("href"),
        title: aElem.innerText,
      });
    }
    return results;
  });
  const descriptions = await nightmare.wait(1000).evaluate(() => {
    const descElements = document.querySelectorAll("div.result__snippet");
    let results = [];
    console.log("descElements:", descElements);
    for (let i = 0; i < descElements.length; i++) {
      let descElem = descElements[i];
      results.push({
        description: descElem ? descElem.innerText : "",
      });
    }
    return results;
  });

  for (let i = 0; i < linksAndTitle.length; i++) {
    var linkAndTitle = linksAndTitle[i];
    linkAndTitle.description = descriptions[i]
      ? descriptions[i].description
      : descriptions[i];

    linkAndTitle.date = new Date().toISOString();
    linksAndTitle[i] = JSON.stringify(linkAndTitle);
  }

  await nightmare.end();

  return linksAndTitle;
}

async function seedArticles() {
  const keywords = await keywordsTable.find({}).toArray();
  let totalResults = [];
  for (let i = 0; i < keywords.length; i++) {
    const kywd = keywords[i].keyword;
    const arts = await getArticles(kywd);
    console.log('arts', arts.length)
    totalResults = [...totalResults, ...arts];
  }
  await addDataToIPFS(JSON.stringify({ data: totalResults }));
  process.exit();
}

export async function readFileFromWeb3Storage(cid) {
  const web3StorageClient = new Web3Storage({
    token: process.env.WEB3STORAGE_API_KEY,
  });

  const res = await web3StorageClient.get(cid);
  const files = await res.files()
  const fileData = Buffer.from(await files[0].arrayBuffer());
  const decompressedD = pako.inflate(fileData, { to: 'string' });
  console.log('cdata:', JSON.parse(decompressedD.toString()));
}

seedArticles();
