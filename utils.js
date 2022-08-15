const axios = require("axios");
const BASE_URL = process.env.NEWS_API_BASE_URL;
const API_KEY = process.env.NEWS_API_KEY;
const ENDPOINTS = {
  TOP_HEADLINES: "/top-headlines",
};

const fetchTopHeadlines = async (params) => {
  try {
    const topHeadlinesRes = await axios.get(
      `${BASE_URL}${ENDPOINTS.TOP_HEADLINES}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    const { articles: headlines = [] } = topHeadlinesRes?.data;
    const filteredHeadlines = headlines.filter(
      (h) => h.url && h.urlToImage && !h.url.includes("youtube")
    );
    return {
      status: topHeadlinesRes.data?.status,
      totalResults: topHeadlinesRes.data?.totalResults,
      articles: filteredHeadlines,
    };
  } catch (error) {
    console.log("Could not fetch top headlines: ", error);
    return [];
  }
};

module.exports = fetchTopHeadlines;
