
/**
 * Stalker Portal API Client
 * Provides methods to interact with a Stalker IPTV portal using the MAC-based
 * API that most middleware (e.g. Stalker, Ministra) expose.
 *
 * This is intentionally lightweight and only implements the subset of actions
 * required by NodeCast TV (live categories, live streams and stream URLs).
 *
 * For authentication we simply attempt to fetch the user profile.
 */

class StalkerApi {
    constructor(baseUrl, mac) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.mac = mac;
    }

    buildUrl(action, params = {}) {
        const url = new URL(`${this.baseUrl}/portal.php`);
        url.searchParams.set('type', 'stalker');
        url.searchParams.set('action', action);
        url.searchParams.set('mac', this.mac);
        for (const [k, v] of Object.entries(params)) {
            if (v !== undefined && v !== null) {
                url.searchParams.set(k, v);
            }
        }
        return url.toString();
    }

    async request(action, params = {}) {
        const url = this.buildUrl(action, params);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Stalker API error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }

    // Authentication simply fetches the profile to verify the portal is reachable
    async authenticate() {
        const data = await this.request('get_profile');
        if (!data || data.hasOwnProperty('auth') && data.auth === false) {
            throw new Error('Invalid credentials or portal response');
        }
        return data;
    }

    async getLiveCategories() {
        const data = await this.request('get_live_categories');
        // Stalker returns an object keyed by category_id, convert to array if necessary
        if (!Array.isArray(data)) {
            return Object.values(data || {}).map(cat => ({
                category_id: cat.category_id || cat.id,
                category_name: cat.category_name || cat.name || cat.category_title,
                parent_id: cat.parent_id || null
            }));
        }
        return data;
    }

    async getLiveStreams(categoryId = null) {
        const params = {};
        if (categoryId) params.category_id = categoryId;
        const data = await this.request('get_live_streams', params);
        if (!Array.isArray(data)) {
            return Object.values(data || {}).map(s => ({
                stream_id: s.stream_id || s.id,
                name: s.name || s.title,
                stream_icon: s.stream_icon || s.icon || s.stream_logo,
                category_id: s.category_id || s.category || null,
                // other fields passed through as-is
                ...s
            }));
        }
        return data;
    }

    buildStreamUrl(streamId, type = 'live', container = 'ts') {
        // Stalker portals generally expose streams under /streaming/tv/<mac>/<streamId>.ext
        // container is usually 'm3u8' or 'ts'
        return `${this.baseUrl}/streaming/tv/${this.mac}/${streamId}.${container}`;
    }

    getXmltvUrl() {
        // Stalker typically provides an xmltv endpoint
        return `${this.baseUrl}/xmltv.php?mac=${this.mac}`;
    }
}

function createFromSource(source) {
    // we store MAC address in source.username field for backwards compatibility
    return new StalkerApi(source.url, source.username);
}

async function authenticate(url, mac) {
    const api = new StalkerApi(url, mac);
    return api.authenticate();
}

module.exports = { StalkerApi, createFromSource, authenticate };
