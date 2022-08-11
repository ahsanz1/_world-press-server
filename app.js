const express = require("express");
const axios = require("axios");
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const app = express();

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

app.get("/complete-article", async (req, res, next) => {
  // Handle the get for this route
  const { url = "" } = req.query;
  if (url) {
    const articleHtml = await axios.get(url);
    // We now have the article HTML, but before we can use Readability to locate
    // the article content we need jsdom to convert it into a DOM object
    let dom = new JSDOM(articleHtml.data, {
      url: url,
    });

    // now pass the DOM document into readability to parse
    let article = new Readability(dom.window.document).parse();

    // Done! The article content is in the textContent property
    console.log(article.textContent);
    res.status(200).send(article.textContent);
  } else {
    res.status("404").send("Invalid URL");
  }
});

app.listen(process.env.PORT || 8080, () => {
  console.log("Listening on port: ", process.env.PORT);
});
