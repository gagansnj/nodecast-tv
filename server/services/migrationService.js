const { getDb } = require('../db/sqlite');
const { hiddenItems, favorites } = require('../db');

async function migrateUserData() {
    console.log('[Migration] Starting user data migration (Hidden Items & Favorites)...');
    const db = getDb();

    try {
        // 1. Migrate Hidden Items
        const allHidden = await hiddenItems.getAll(); // returns array of { source_id, item_type, item_id }

        const hidStmt = db.prepare(`
            UPDATE playlist_items 
            SET is_hidden = 1 
            WHERE source_id = ? AND type = ? AND item_id = ?
        `);

        const catHidStmt = db.prepare(`
            UPDATE categories 
            SET is_hidden = 1 
            WHERE source_id = ? AND type = ? AND category_id = ?
        `);

        let hidCount = 0;
        const migrateHidden = db.transaction((items) => {
            for (const item of items) {
                // Map db.json types to SQLite types
                // db.json types: 'channel', 'group', 'vod_category', 'series_category'
                // SQLite types: 'live', 'movie', 'series' (for categories/items)

                if (item.item_type === 'channel') {
                    // Hidden channel -> playlist_items (type='live')
                    const res = hidStmt.run(item.source_id, 'live', item.item_id);
                    if (res.changes > 0) hidCount++;
                } else if (item.item_type === 'group') {
                    // Hidden group -> categories (type='live')
                    const res = catHidStmt.run(item.source_id, 'live', item.item_id); // item_id is group name/id
                    if (res.changes > 0) hidCount++;
                } else if (item.item_type === 'vod_category') {
                    const res = catHidStmt.run(item.source_id, 'movie', item.item_id);
                    if (res.changes > 0) hidCount++;
                } else if (item.item_type === 'series_category') {
                    const res = catHidStmt.run(item.source_id, 'series', item.item_id);
                    if (res.changes > 0) hidCount++;
                }
            }
        });

        migrateHidden(allHidden);
        console.log(`[Migration] Migrated ${hidCount} hidden items/categories.`);


        // 2. Migrate Favorites
        const allFavorites = await favorites.getAll();

        const favStmt = db.prepare(`
            UPDATE playlist_items 
            SET is_favorite = 1 
            WHERE source_id = ? AND type = ? AND item_id = ?
        `);

        let favCount = 0;
        const migrateFavorites = db.transaction((favs) => {
            for (const fav of favs) {
                // Map types
                // db.json: 'channel', 'movie', 'series'
                // SQLite: 'live', 'movie', 'series'

                let type = fav.item_type;
                if (type === 'channel') type = 'live';

                const res = favStmt.run(fav.source_id, type, fav.item_id);
                if (res.changes > 0) favCount++;
            }
        });

        migrateFavorites(allFavorites);
        console.log(`[Migration] Migrated ${favCount} favorites.`);

    } catch (e) {
        console.error('[Migration] Failed:', e);
    }
}

module.exports = { migrateUserData };
