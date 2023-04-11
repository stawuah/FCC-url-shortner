require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require("dns")
const mongoose = require('mongoose');
const validUrl = require('valid-url');
const bodyParser = require('body-parser');


app.use(express.json())
app.use(express.urlencoded({extended : true}))
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Connect to MongoDB database
mongoose.connect(process.env.DB_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Define URL schema and model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});
const Url = mongoose.model('Url', urlSchema);

// Define routes
app.post('/api/shorturl', async (req, res) => {
  const { url } = req.body;

  // Check if the submitted URL is valid
  if (!validUrl.isWebUri(url)) {
    return res.json({ error: 'invalid url' });
  }

  // Resolve the submitted URL to an IP address to check if it exists
  const hostname = new URL(url).hostname;
  dns.lookup(hostname, async (err, address) => {
    if (err) {
      return res.json({ error: 'invalid url' });
    }

    // Check if the URL already exists in the database
    let urlObj = await Url.findOne({ original_url: url });
    if (urlObj) {
      return res.json({ original_url: urlObj.original_url, short_url: urlObj.short_url });
    }

    // Generate a new short URL
    let count = await Url.countDocuments();
    let shortUrl = count + 1;

    // Create a new URL object and save it to the database
    urlObj = new Url({ original_url: url, short_url: shortUrl });
    await urlObj.save();

    // Return the original URL and the short URL
    res.json({ original_url: url, short_url: shortUrl });
    });
});

app.get('/api/shorturl/:short_url', async (req, res) => {
  const { short_url } = req.params;

  // Find the URL object with the given short URL
  const urlObj = await Url.findOne({ short_url: short_url });

  if (!urlObj) {
    return res.json({ error: 'invalid url' });
  }

  // Redirect to the original URL
  res.redirect(urlObj.original_url);
});


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
