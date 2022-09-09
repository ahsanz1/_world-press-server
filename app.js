require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const { fetchTopHeadlines, searchArticles } = require("./utils");
const https = require("node:https");
const fs = require("fs");
const path = require("node:path");
const { Checkout } = require("checkout-sdk-node");
const logger = require("heroku-logger");
const bodyParser = require("body-parser");
const app = express();

const cko = new Checkout("sk_test_1f05c2d3-0a01-47c8-807e-a10ec17ea170", {
  pk: "pk_test_99ac8b62-1c16-4614-a43e-ea3a998206ef",
});

app.use(bodyParser.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/top-headlines", async (req, res) => {
  try {
    const { paramString = "" } = req.query;
    const {
      articles = [],
      status = "",
      totalResults = 0,
    } = await fetchTopHeadlines(paramString);
    res.status(200).json({ articles, status, totalResults });
  } catch (error) {
    console.log(error);
    res.status(400).send(error.message);
  }
});

app.get("/author-articles", async (req, res) => {
  try {
    const { authorName = "" } = req.query;
    console.log(authorName);
    const {
      articles = [],
      status = "",
      totalResults = 0,
    } = await searchArticles(authorName);
    const filteredArticles = articles.filter(
      (aa) =>
        aa.url &&
        aa.urlToImage &&
        !aa.url.includes("youtube") &&
        aa.author !== null &&
        aa.author === authorName
    );
    res.status(200).json({
      articles: filteredArticles,
      status,
      totalResults: filteredArticles.length,
    });
  } catch (error) {
    console.log(error);
    res.status(400).send(error.message);
  }
});

app.get("/complete-article", async (req, res) => {
  // Handle the get for this route
  const { url = "" } = req.query;
  try {
    const articleHtml = await axios.get(url);
    // We now have the article HTML, but before we can use Readability to locate
    // the article content we need jsdom to convert it into a DOM object
    console.log(articleHtml);

    let dom = new JSDOM(articleHtml.data, {
      url: url,
    });

    // now pass the DOM document into readability to parse
    let article = new Readability(dom.window.document).parse();

    // Done! The article content is in the textContent property
    console.log(article);
    res.status(200).send(article.content);
  } catch (error) {
    res.status("404").send(error.message);
  }
});

app.post("/validate-session", async (req, res) => {
  console.log("Request Body: ", req.body);
  const {
    appleUrl = "https://apple-pay-gateway-cert.apple.com/paymentservices/startSession",
  } = req.body;
  logger.info("Apple URL: ", { message: appleUrl });
  try {
    let httpsAgent = new https.Agent({
      rejectUnauthorized: false,
      cert: await fs.readFileSync(
        path.join(__dirname, "/certificates/certificate_sandbox.pem")
      ),
      key: await fs.readFileSync(
        path.join(__dirname, "/certificates/certificate_sandbox.key")
      ),
    });
    let response = await axios.post(
      appleUrl,
      {
        merchantIdentifier: "merchant.com.lazurde.sandbox",
        domainName: "https://dev-lazurde.vercel.app",
        displayName: "Lazurde",
      },
      {
        httpsAgent,
      }
    );
    // logger.info("Validate session res: ", { message: response.data });
    res.send(response.data);
  } catch (error) {
    console.log("Error while validating session: ", error);
    res.status(400).json({
      message: error.message,
    });
  }
});

app.post("/pay", async (req, res) => {
  const { version, data, signature, header } = req.body.token.paymentData;
  logger.info("/pay details", { version, data, signature, header });
  try {
    const checkoutToken = await cko.tokens.request({
      // infered type: "applepay"
      token_data: {
        version: version,
        data: data,
        signature: signature,
        header: {
          ephemeralPublicKey: header.ephemeralPublicKey,
          publicKeyHash: header.publicKeyHash,
          transactionId: header.transactionId,
        },
      },
    });
    logger.info("Checkout token: ", { message: checkoutToken });

    const payment = await cko.payments.request({
      source: {
        token: checkoutToken.token,
      },
      amount: 10,
      currency: "USD",
    });
    logger.info("Payment res: ", { message: payment });
    res.send(payment);
  } catch (error) {
    console.log("Error while making payment: ", error);
    logger.error("Error while making payment: ", { message: error });
    res.send(error);
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Listening on port: ", process.env.PORT);
});
