const express = require('express');
const path = require('path');
const { convert } = require('./converter');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/convert', (req, res) => {
  const { value, from, to } = req.body;
  if (value === undefined || !from || !to) {
    return res.status(400).json({ error: 'Missing value, from, or to' });
  }
  const result = convert(value, from, to);
  res.json(result);
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Unit converter running on http://localhost:${PORT}`);
  });
}

module.exports = app;
