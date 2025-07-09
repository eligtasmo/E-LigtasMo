const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();

const ORS_API_KEY = '5b3ce3597851110001cf6248d40a71b0b51c4c9eb9927348e7276122'; // <-- Inserted real OpenRouteService API key

app.use(cors());
app.use(express.json());

app.get('/api/nearest', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ error: 'Missing lat or lng' });
  }
  const url = 'https://api.openrouteservice.org/v2/nearest/driving-car';
  const body = {
    coordinates: [[parseFloat(lng), parseFloat(lat)]]
  };
  console.log('Proxy /api/nearest request:', body);
  try {
    const orsRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': ORS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    let text;
    try {
      text = await orsRes.text();
    } catch (bodyErr) {
      console.error('Failed to read ORS response body:', bodyErr);
      return res.status(500).json({ error: 'Failed to read ORS response body', details: bodyErr.message });
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (jsonErr) {
      console.error('ORS returned non-JSON (raw text below):');
      console.error(text);
      return res.status(orsRes.status).json({ error: 'ORS returned non-JSON', status: orsRes.status, body: text });
    }
    console.log('ORS response status:', orsRes.status);
    if (!orsRes.ok) {
      console.error('ORS error:', data);
      return res.status(orsRes.status).json({ error: data, status: orsRes.status });
    }
    res.json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    res.status(500).json({ error: 'Failed to fetch from ORS', details: err.message });
  }
});

app.listen(5000, () => console.log('Proxy running on port 5000')); 