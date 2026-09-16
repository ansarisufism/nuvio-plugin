// PikaHD Scraper for Nuvio Local Scrapers
const BASE_URL = 'https://new.pikahd.co';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
};

// Generic fetch helper with proper headers
function fetchText(url) {
    return fetch(url, { headers: HEADERS })
        .then(function (response) {
            if (!response.ok) {
                throw new Error('HTTP error ' + response.status);
            }
            return response.text();
        });
}

// Extract and normalize quality labels
function parseQuality(text) {
    var lower = String(text || '').toLowerCase();
    if (lower.indexOf('2160') !== -1 || lower.indexOf('4k') !== -1) return '4K';
    if (lower.indexOf('1080') !== -1) return '1080p';
    if (lower.indexOf('720') !== -1) return '720p';
    if (lower.indexOf('480') !== -1) return '480p';
    return '1080p';
}

// Search function for Nuvio
function search(query) {
    var searchUrl = BASE_URL + '/?q=' + encodeURIComponent(query);
    
    return fetchText(searchUrl)
        .then(function (html) {
            var results = [];
            // Simple regex to extract post/movie items from PikaHD search page
            // (Note: Adjust regex attributes if site DOM elements differ)
            var regex = /<a[^>]+href="([^"]+)"[^>]*>.*?<img[^>]+alt="([^"]+)"/gi;
            var match;
            
            while ((match = regex.exec(html)) !== null) {
                var url = match[1];
                var title = match[2];
                
                if (url && title && !results.some(function(r) { return r.url === url; })) {
                    results.push({
                        url: url.startsWith('http') ? url : BASE_URL + url,
                        title: title.trim()
                    });
                }
            }
            return results;
        })
        .catch(function (err) {
            console.error('[PikaHD] Search Error: ', err);
            return [];
        });
}

// Stream extractor function for Nuvio
getStreams = function (id, mediaType, season, episode) {
    // If id is a direct URL or search term passed from Nuvio resolution
    var targetUrl = (typeof id === 'string' && id.startsWith('http')) ? id : null;
    
    if (!targetUrl) {
        return Promise.resolve([]);
    }

    return fetchText(targetUrl)
        .then(function (html) {
            var streams = [];
            
            // Extracting video sources or playable stream elements
            // Matching iframe embeds or direct video links (.mp4, .m3u8)
            var linkRegex = /href="(https?:\/\/[^"]+\.(mp4|m3u8)[^"]*)"/gi;
            var match;
            
            while ((match = linkRegex.exec(html)) !== null) {
                var streamUrl = match[1];
                var quality = parseQuality(streamUrl);
                
                streams.push({
                    name: '⌜ PikaHD ⌟ | Direct - ' + quality,
                    title: 'PikaHD High Speed Stream',
                    url: streamUrl,
                    quality: quality,
                    size: 'Unknown',
                    headers: HEADERS,
                    provider: 'pikahd'
                });
            }

            return streams;
        })
        .catch(function (err) {
            console.error('[PikaHD] Stream Error: ', err);
            return [];
        });
};

// Export module for Nuvio app compatibility
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { search: search, getStreams: getStreams };
} else {
    global.PikaHDScraperModule = { search: search, getStreams: getStreams };
}
