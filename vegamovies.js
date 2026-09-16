// Updated VegaMovies Provider for Nuvio using the new domain
const BASE_URL = "https://new2.vegamovies.futbol";

const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Referer": `${BASE_URL}/`
};

async function search(query) {
    try {
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        const response = await fetch(searchUrl, { headers });
        const html = await response.text();
        
        let results = [];
        const postMatches = html.matchAll(/<h2 class="title"><a href="([^"]+)"[^>]*>([^<]+)<\/a><\/h2>/g);
        
        for (const match of postMatches) {
            results.push({
                url: match[1],
                title: match[2].trim()
            });
        }
        
        return results;
    } catch (error) {
        console.error("VegaMovies Search Error:", error.message);
        return [];
    }
}

async function getStreams(movieUrl) {
    try {
        const response = await fetch(movieUrl, { headers });
        const html = await response.text();
        
        let streams = [];
        const linkMatches = html.matchAll(/href="(https:\/\/[^"]+)"[^>]*>.*?([0-9]{3,4}p|4K|2160p)/gi);
        
        for (const match of linkMatches) {
            let link = match[1];
            let qualityLabel = match[2].toUpperCase();
            
            if (!link.includes("telegram") && !link.includes("whatsapp")) {
                streams.push({
                    name: `VegaMovies - ${qualityLabel}`,
                    title: `Stream Quality: ${qualityLabel}`,
                    url: link,
                    quality: qualityLabel,
                    headers: headers
                });
            }
        }

        return streams;
    } catch (error) {
        console.error("VegaMovies Stream Error:", error.message);
        return [];
    }
}

module.exports = { search, getStreams };
