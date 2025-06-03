const axios = require('axios');

const NYT_API_KEY = '25ny3F9QkVO7AXPGtztRlrCzOiOvVzZd';

async function fetchNYTNews() {
    try {
        const apiUrl = `https://api.nytimes.com/svc/news/v3/content/all/all.json?api-key=${NYT_API_KEY}`;
        const response = await axios.get(apiUrl);
        return response.data;
    } catch (error) {
        console.error('Error fetching news from New York Times:', error);
        throw error;
    }
}

module.exports = fetchNYTNews;
