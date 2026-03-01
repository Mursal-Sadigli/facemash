const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb+srv://fullmursel2025_db_user:jjD65NDc14JIlBDg@cluster0.524owwq.mongodb.net/facemash?retryWrites=true&w=majority&appName=Cluster0')
.then(async () => {
    console.log("MongoDB-ə uğurla qoşuldu");

    try {
        const collections = await mongoose.connection.db.listCollections({name: 'images'}).toArray();
        if (collections.length > 0) {
            const indexes = await mongoose.connection.db.collection('images').indexes();
            if (indexes.some(index => index.name === 'id_1')) {
                await mongoose.connection.db.collection('images').dropIndex('id_1');
                console.log("id_1 indeksi silindi.");
            }
        }
    } catch(err) {
        if(err.code !== 26) {
            console.error("İndeks silinərkən xəta:", err);
        }
    }
})
.catch(err => console.error("MongoDB bağlantı xətası:", err));

const imageSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String },
    rating: { type: Number, default: 1200 },
    category: { type: String, required: true },
    votes: { type: Number, default: 0 }
});

const Image = mongoose.model('Image', imageSchema);

const statsSchema = new mongoose.Schema({
    totalVisitors: { type: Number, default: 0 },
    totalVotes: { type: Number, default: 0 },
    totalVoters: { type: Number, default: 0 }
});

const Stats = mongoose.model('Stats', statsSchema);


app.get('/init', async (req, res) => {
    try {
        const count = await Image.countDocuments({ category: 'dizayn' });
        if(count === 0) {
            let images = [];
            for(let i = 1; i <= 50; i++){
                images.push({ name: `Design ${i}`, rating: 1200, category: 'dizayn', votes: 0 });
            }
            await Image.insertMany(images);
            return res.json({ message: 'Dizayn şəkilləri əlavə olundu.' });
        }
        res.json({ message: 'Dizayn şəkilləri artıq mövcuddur.' });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/updateVisitor', async (req, res) => {
    try {
        let stats = await Stats.findOne();
        if (!stats) {
            stats = new Stats();
        }
        stats.totalVisitors += 1;
        await stats.save();
        res.json({ message: 'Ziyarətçi sayı yeniləndi.', stats });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/updateVote', async (req, res) => {
    const { isNewVoter } = req.body; 
    try {
        let stats = await Stats.findOne();
        if (!stats) {
            stats = new Stats();
        }
        stats.totalVotes += 1;
        if (isNewVoter) {
            stats.totalVoters += 1;
        }
        await stats.save();
        res.json({ message: 'Səs statistikası yeniləndi.', stats });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});
app.get('/stats', async (req, res) => {
    try {
        const stats = await Stats.findOne() || new Stats();
        res.json(stats);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});


app.post('/updateRating', async (req, res) => {
    const { name, url, rating, votes, category } = req.body;
    if (!name || typeof rating !== 'number' || !category) {
        return res.status(400).json({ error: 'Yanlış məlumat göndərildi.' });
    }
    try {
        let updateData = { rating, votes, category };
        if (url) updateData.url = url;
        
        let image = await Image.findOneAndUpdate(
            { name },
            updateData,
            { new: true }
        );
        if (!image) {
            image = new Image({ name, url, rating, votes, category });
            await image.save();
            return res.json({ message: 'Şəkil yaradıldı və reytinq əlavə olundu.', image });
        }
        res.json({ message: 'Reytinq yeniləndi.', image });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/ratings', async (req, res) => {
    try {
        const images = await Image.find({});
        res.json(images);
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda işləyir.`);
});
