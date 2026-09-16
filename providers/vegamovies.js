
import_cheerio_without_node_native = __toESM(require('cheerio'));
const PROVIDER_NAME = 'VegaMovies';
const BASE_URL = 'https://new2.vegamovies.futbol';
const TMDB_URL = 'https://api.themoviedb.org/3';
const TMDB_KEY = '439c478a771f35c05022f9feabcca01c';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HEADERS = { 'User-Agent': USER_AGENT, 'Referer': BASE_URL + '/' };

function getInvertedSortTag(n, max = 999999) {
    const num = Math.max(0, parseInt(n, 10) || 0);
    const diff = Math.max(0, max - num);
    const bin = diff.toString(2).padStart(20, '0');
    return bin.split('').map(b => b === '1' ? '\ufeff' : '​').join('');
}

function resolveSettings(settings) {
    let config = { 'sortBy': 'quality' };
    try {
        let s = settings;
        if (!s && typeof globalThis !== 'undefined') s = globalThis['SCRAPER_SETTINGS'] || globalThis['SETTINGS'] || globalThis['settings'];
        if (s) {
            let sort = s['sort'] || s['sort_by'] || s['sortBy'] || '';
            let val = String(sort).toLowerCase();
            if (val.includes('size') || val.includes('largest')) config['sortBy'] = 'size';
        }
    } catch (e) {}
    return config;
}

function onSettings() {
    return [{ 'type': 'select', 'key': 'sortBy', 'name': 'sort_by', 'label': 'Sort By', 'options': [{ 'label': 'Quality', 'value': 'quality' }, { 'label': 'Size', 'value': 'size' }], 'default': 'quality' }];
}

function fetchText(url) {
    return __async(this, arguments, function*(u, ref = BASE_URL) {
        const res = yield fetch(u, { 'headers': __spreadProps(__spreadValues({}, HEADERS), { 'Referer': ref + '/' }) });
        if (!res['ok']) throw new Error('HTTP ' + res['status'] + ': ' + u);
        return res['text']();
    });
}

function absoluteUrl(link, base = BASE_URL) {
    if (!link) return '';
    if (/^https?:\/\//i['test'](link)) return link;
    try { return new URL(link, base)['toString'](); } catch (e) { return ''; }
}

function decodeBase64(input) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let str = String(input || '')['replace'](/=+$/, '');
    let output = '', bs = 0, buffer, bc = 0;
    for (let idx = 0; buffer = str['charAt'](idx++);) {
        buffer = chars['indexOf'](buffer);
        if (buffer < 0) continue;
        bs = bc % 4 ? bs * 64 + buffer : buffer;
        bc++ % 4 && (output += String['fromCharCode'](255 & bs >> (-2 * bc & 6)));
    }
    return output;
}

function rot13(str) {
    return String(str || '')['replace'](/[a-zA-Z]/g, c => {
        let code = c['charCodeAt'](0) + 13;
        let limit = c <= 'Z' ? 90 : 122;
        return String['fromCharCode'](code <= limit ? code : code - 26);
    });
}

function decodeEntities(text) {
    if (!text) return '';
    const entities = { 'nbsp': ' ', 'amp': '&', 'quot': '"', 'lt': '<', 'gt': '>', '#038': '&' };
    return text['replace'](/&(nbsp|amp|quot|lt|gt|#038);/g, (match, key) => entities[key] || match)
               ['replace'](/&#(\d+);/g, (m, dec) => String['fromCharCode'](dec));
}

function normalizeTitle(title) {
    return String(title || '')['toLowerCase']()['replace'](/\[[^\]]*]/g, ' ')
               ['replace'](/\b(the|a|an)\b/g, ' ')['replace'](/[^a-z0-9]+/g, ' ')['trim']();
}

function titleScore(query, target) {
    const qWords = normalizeTitle(query)['split'](' ')['filter'](Boolean);
    const tSet = new Set(normalizeTitle(target)['split'](' ')['filter'](Boolean));
    if (!qWords['length']) return 0;
    const matches = qWords['filter'](w => tSet['has'](w))['length'];
    return matches / qWords['length'];
}

function parseQuality(q) {
    var lower = String(q || '')['toLowerCase']();
    if (lower['indexOf']('2160') >= 0 || lower['indexOf']('4k') >= 0) return '4K';
    if (lower['indexOf']('1080') >= 0) return '1080p';
    if (lower['indexOf']('720') >= 0) return '720p';
    if (lower['indexOf']('480') >= 0) return '480p';
    return '1080p';
}

function getQualityRank(q) {
    var lower = String(q)['toLowerCase']();
    if (lower['includes']('4k') || lower['includes']('2160')) return 4;
    if (lower['includes']('1080') || lower['includes']('fhd')) return 3;
    if (lower['includes']('720') || lower['includes']('hd')) return 2;
    if (lower['includes']('480') || lower['includes']('sd')) return 1;
    return 0;
}

function parseSize(s) {
    const match = String(s || '')['match'](/([\d.]+)\s*(GB|MB|KB)/i);
    return match ? match[1] + ' ' + match[2]['toUpperCase']() : 'N/A';
}

function isDirectVideo(url) {
    try {
        const host = new URL(url)['hostname']['toLowerCase']();
        return host['includes']('pixeldrain') || host['endsWith']('.r2.cloudflarestorage.com');
    } catch (e) { return false; }
}

function getMetadata(id, type) {
    return __async(this, null, function* () {
        const t = type === 'tv' || type === 'series' ? 'tv' : 'movie';
        const res = yield fetch(TMDB_URL + '/' + t + '/' + encodeURIComponent(id) + '?api_key=' + TMDB_KEY + '&language=en-US', { 'headers': { 'Accept': 'application/json', 'User-Agent': USER_AGENT } });
        if (!res['ok']) throw new Error('TMDB Error: ' + res['status']);
        const data = yield res['json']();
        const date = t === 'tv' ? data['first_air_date'] : data['release_date'];
        return { 'title': t === 'tv' ? data['name'] : data['title'], 'year': date ? Number(date['slice'](0, 4)) : null };
    });
}

function findPage(meta, isTv, season) {
    return __async(this, null, function* () {
        const query = isTv && season ? meta['title'] + ' Season ' + season : (meta['title'] + ' ' + (meta['year'] || ''))['trim']();
        const html = yield fetchText(BASE_URL + '/?s=' + encodeURIComponent(query));
        const $ = import_cheerio_without_node_native['default']['load'](html);
        let best = null;

        $('article, div.item, div.post').each((_, el) => {
            const item = $(el);
            const title = item.find('h2, h3, a.title')?.text()?.trim() || '';
            const link = item.find('a[href]')?.first()?.attr('href');
            if (!title || !link) return;

            let score = titleScore(meta['title'], title);
            const targetUrl = absoluteUrl(link);
            if (!best || score > best['score']) {
                best = { 'url': targetUrl, 'score': score, 'title': title };
            }
        });

        return best && best['score'] >= 0.4 ? best['url'] : '';
    });
}

function decodeRedirect(url) {
    return __async(this, null, function* () {
        if (/hubcloud|hubdrive/i['test'](url)) return url;
        try {
            const html = yield fetchText(url);
            let match = html.match(/['"]o['"]\s*,\s*['"]([^'"]+)['"]/);
            if (!match) return url;
            const decoded = decodeBase64(rot13(decodeBase64(decodeBase64(match[1]))));
            const json = JSON['parse'](decoded);
            return json['o'] ? decodeBase64(json['o'])['trim']() : url;
        } catch (e) { return url; }
    });
}

function findHubCloud(container, base, $) {
    return __async(this, null, function* () {
        const links = container.find('a[href]')['get']();
        for (const el of links) {
            const a = $(el);
            const href = a['attr']('href');
            const text = a['text']();
            if (!href) continue;
            if (/hubcloud|hubdrive/i['test'](text) || /hubcloud|hubdrive/i['test'](href)) {
                return decodeRedirect(absoluteUrl(href, base));
            }
        }
        return '';
    });
}

function extractHubCloud(url, meta) {
    return __async(this, null, function* () {
        try {
            let html = yield fetchText(url, url);
            const $ = import_cheerio_without_node_native['default']['load'](html);
            let streams = [];
            $('a.btn, a[href*="pixeldrain"]').each((_, el) => {
                const link = $(el)['attr']('href');
                if (link && isDirectVideo(link)) {
                    streams.push({ 'url': link, 'title': meta['title'], 'quality': meta['quality'], 'size': meta['size'] });
                }
            });
            return streams;
        } catch (e) { return []; }
    });
}

function extractStreams(url, isTv, season, episode) {
    return __async(this, null, function* () {
        const html = yield fetchText(url);
        const $ = import_cheerio_without_node_native['default']['load'](html);
        let items = [];

        $('p, div.entry-content, .download-links').each((_, el) => {
            items.push($(el));
        });

        let results = [];
        for (const el of items) {
            const text = el['text']()['trim']();
            const meta = { 'title': text.slice(0, 50), 'quality': parseQuality(text), 'size': parseSize(text) };
            const hub = yield findHubCloud(el, url, $);
            if (hub) {
                const extracted = yield extractHubCloud(hub, meta);
                results.push(...extracted);
            }
        }
        return results;
    });
}

function buildStreamObject(title, desc, url, quality, size, headers, epStr, meta, sort) {
    return {
        'qualityRank': getQualityRank(quality),
        'sizeInMB': 100,
        'data': {
            'name': PROVIDER_NAME + ' | ' + quality,
            'title': title + '\n' + quality + ' (' + size + ')',
            'size': size,
            'url': url || '',
            'behaviorHints': { 'notWebReady': true, 'proxyHeaders': { 'request': headers } }
        }
    };
}

function getStreams(id, type, season = null, episode = null, settings = {}) {
    return __async(this, null, function* () {
        const isTv = type === 'tv' || type === 'series';
        if (!id) return [];
        try {
            const meta = yield getMetadata(id, type);
            const pageUrl = yield findPage(meta, isTv, season);
            if (!pageUrl) return [];
            const rawStreams = yield extractStreams(pageUrl, isTv, season, episode);
            
            let streams = [];
            for (const s of rawStreams) {
                streams.push(buildStreamObject(meta['title'], s['title'], s['url'], s['quality'], s['size'], HEADERS, '', meta, 'quality'));
            }
            return streams.map(s => s['data']);
        } catch (e) { return []; }
    });
}

module.exports = { 'getStreams': getStreams, 'onSettings': onSettings };
