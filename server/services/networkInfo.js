const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let cachedNetworkInfo = null;

async function fetchExternalNetworkInfo() {
    // Try multiple services in order of preference
    const services = [
        {
            url: 'https://ipinfo.io/json',
            parse: (data) => ({
                externalIp: data.ip,
                isp: data.org || 'Unknown'
            })
        },
        {
            url: 'https://api.ipify.org?format=json',
            parse: (data) => ({ externalIp: data.ip, isp: null })
        },
        {
            url: 'https://httpbin.org/ip',
            parse: (data) => ({ externalIp: data.origin, isp: null })
        },
        {
            url: 'https://api64.ipify.org?format=json',
            parse: (data) => ({ externalIp: data.ip, isp: null })
        }
    ];

    for (const service of services) {
        try {
            const response = await fetch(service.url, {
                headers: {
                    'User-Agent': 'nodecast-tv/2.1.4'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const result = service.parse(data);

            if (result.externalIp) {
                return result;
            }
        } catch (err) {
            console.warn(`Failed to fetch from ${service.url}:`, err.message);
            continue;
        }
    }

    throw new Error('All IP lookup services failed');
}

async function getNetworkStatus() {
    const now = Date.now();
    const lastFetched = cachedNetworkInfo?.fetchedAt || 0;

    if (cachedNetworkInfo && now - lastFetched < CACHE_TTL) {
        return {
            externalIp: cachedNetworkInfo.externalIp,
            isp: cachedNetworkInfo.isp || 'Unknown',
            serverOnline: cachedNetworkInfo.serverOnline,
            lastChecked: cachedNetworkInfo.lastChecked,
        };
    }

    try {
        const info = await fetchExternalNetworkInfo();
        const networkStatus = {
            externalIp: info.externalIp,
            isp: info.isp || 'Unknown',
            serverOnline: true,
            lastChecked: new Date().toISOString(),
            fetchedAt: now,
        };

        cachedNetworkInfo = networkStatus;
        return {
            externalIp: networkStatus.externalIp,
            isp: networkStatus.isp,
            serverOnline: networkStatus.serverOnline,
            lastChecked: networkStatus.lastChecked,
        };
    } catch (err) {
        const errorStatus = {
            externalIp: cachedNetworkInfo?.externalIp || null,
            isp: cachedNetworkInfo?.isp || 'Unknown',
            serverOnline: false,
            lastChecked: new Date().toISOString(),
            error: err.message,
            fetchedAt: now,
        };

        cachedNetworkInfo = {
            ...cachedNetworkInfo,
            ...errorStatus,
        };

        return {
            externalIp: errorStatus.externalIp,
            isp: errorStatus.isp,
            serverOnline: false,
            lastChecked: errorStatus.lastChecked,
        };
    }
}

module.exports = {
    getNetworkStatus,
};
