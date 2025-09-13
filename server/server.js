require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');

const filesRouter = require('./routes/files');
const authRouter = require('./routes/auth');
const archivesRouter = require('./routes/archives');
const errorHandler = require('./middleware/errorHandler');
const setupSwagger = require('./swagger');

const app = express();


app.use(express.json());
setupSwagger(app);


// Routes
app.use('/api/auth', authRouter);
app.use('/api/files', filesRouter);
app.use('/api/archives', archivesRouter);

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Archive job
require('./services/archiveJob')();
