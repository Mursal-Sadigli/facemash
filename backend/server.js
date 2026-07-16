const express = require('express');
const { neon } = require('@neondatabase/serverless');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// NeonDB bağlantısı
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_A2Z0GcrbiTUk@ep-plain-bonus-asojuitt-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

const sql = neon(DATABASE_URL);

// Cədvəlləri yarat (əgər mövcud deyilsə)
async function initializeDatabase() {
    try {
        await sql`
            CREATE TABLE IF NOT EXISTS images (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                url TEXT,
                rating REAL DEFAULT 1200,
                category TEXT NOT NULL,
                votes INTEGER DEFAULT 0
            )
        `;

        // name sütununa UNIQUE constraint əlavə et (əgər hələ yoxdursa)
        await sql`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'images_name_key'
                ) THEN
                    ALTER TABLE images ADD CONSTRAINT images_name_key UNIQUE (name);
                END IF;
            END $$
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS stats (
                id SERIAL PRIMARY KEY,
                total_visitors INTEGER DEFAULT 0,
                total_votes INTEGER DEFAULT 0,
                total_voters INTEGER DEFAULT 0
            )
        `;

        // Stats cədvəlində ən azı bir sətir olsun
        const existingStats = await sql`SELECT COUNT(*) as count FROM stats`;
        if (parseInt(existingStats[0].count) === 0) {
            await sql`INSERT INTO stats (total_visitors, total_votes, total_voters) VALUES (0, 0, 0)`;
        }

        console.log("NeonDB cədvəlləri uğurla yaradıldı/yoxlanıldı.");
    } catch (err) {
        console.error("Cədvəl yaradılarkən xəta:", err);
    }
}

initializeDatabase();

// GET /init - Dizayn şəkillərini əlavə et
app.get('/init', async (req, res) => {
    try {
        const result = await sql`SELECT COUNT(*) as count FROM images WHERE category = 'dizayn'`;
        const count = parseInt(result[0].count);
        if (count === 0) {
            // 50 dizayn şəkli əlavə et
            for (let i = 1; i <= 50; i++) {
                await sql`INSERT INTO images (name, rating, category, votes) VALUES (${`Design ${i}`}, 1200, 'dizayn', 0)`;
            }
            return res.json({ message: 'Dizayn şəkilləri əlavə olundu.' });
        }
        res.json({ message: 'Dizayn şəkilləri artıq mövcuddur.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /updateVisitor - Ziyarətçi sayını artır
app.post('/updateVisitor', async (req, res) => {
    try {
        const result = await sql`
            UPDATE stats SET total_visitors = total_visitors + 1
            RETURNING *
        `;
        res.json({ message: 'Ziyarətçi sayı yeniləndi.', stats: result[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /updateVote - Səs statistikasını yenilə
app.post('/updateVote', async (req, res) => {
    const { isNewVoter } = req.body;
    try {
        let result;
        if (isNewVoter) {
            result = await sql`
                UPDATE stats SET total_votes = total_votes + 1, total_voters = total_voters + 1
                RETURNING *
            `;
        } else {
            result = await sql`
                UPDATE stats SET total_votes = total_votes + 1
                RETURNING *
            `;
        }
        res.json({ message: 'Səs statistikası yeniləndi.', stats: result[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /stats - Statistikaları göstər
app.get('/stats', async (req, res) => {
    try {
        const result = await sql`SELECT * FROM stats LIMIT 1`;
        if (result.length > 0) {
            // Frontend-in gözlədiyi formata uyğunlaşdır (camelCase)
            const stats = {
                totalVisitors: result[0].total_visitors,
                totalVotes: result[0].total_votes,
                totalVoters: result[0].total_voters
            };
            res.json(stats);
        } else {
            res.json({ totalVisitors: 0, totalVotes: 0, totalVoters: 0 });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /updateRating - Reytinqi yenilə və ya yeni şəkil yarat
app.post('/updateRating', async (req, res) => {
    const { name, url, rating, votes, category } = req.body;
    if (!name || typeof rating !== 'number' || !category) {
        return res.status(400).json({ error: 'Yanlış məlumat göndərildi.' });
    }
    try {
        // UPSERT: varsa yenilə, yoxdursa yarat
        let result;
        if (url) {
            result = await sql`
                INSERT INTO images (name, url, rating, category, votes)
                VALUES (${name}, ${url}, ${rating}, ${category}, ${votes || 0})
                ON CONFLICT (name) DO UPDATE SET
                    url = ${url},
                    rating = ${rating},
                    category = ${category},
                    votes = ${votes || 0}
                RETURNING *
            `;
        } else {
            result = await sql`
                INSERT INTO images (name, rating, category, votes)
                VALUES (${name}, ${rating}, ${category}, ${votes || 0})
                ON CONFLICT (name) DO UPDATE SET
                    rating = ${rating},
                    category = ${category},
                    votes = ${votes || 0}
                RETURNING *
            `;
        }
        res.json({ message: 'Reytinq yeniləndi.', image: result[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /ratings - Bütün şəkilləri göstər
app.get('/ratings', async (req, res) => {
    try {
        const images = await sql`SELECT * FROM images`;
        res.json(images);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda işləyir.`);
});
