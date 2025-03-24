const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const cors = require('cors');
const bodyParser = require('body-parser');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Configure storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: (req, file, cb) => {
    const prompter = req.body.prompter || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `prompter-${prompter}-${uniqueSuffix}${ext}`);
  }
});

// File filter to only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Ensure uploads directory exists
fs.ensureDirSync(path.join(__dirname, '../public/uploads'));

// Data file for storing votes
const votesFilePath = path.join(__dirname, '../public/votes.json');

// Initialize votes file if it doesn't exist
if (!fs.existsSync(votesFilePath)) {
  fs.writeJsonSync(votesFilePath, { images: [] });
}

// Routes
// Upload image
app.post('/api/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    const prompter = req.body.prompter;
    if (!prompter) {
      return res.status(400).json({ error: 'Prompter name is required' });
    }

    // Store prompter number if provided
    const prompterNumber = req.body.prompterNumber || null;
    
    const imageUrl = `/uploads/${req.file.filename}`;
    
    // Add image to votes.json
    const votesData = fs.readJsonSync(votesFilePath);
    
    // Check if we already have 2 images
    if (votesData.images.length >= 2) {
      return res.status(400).json({ error: 'Maximum of 2 images already uploaded' });
    }
    
    // Check if this prompter already uploaded an image
    const prompterExists = votesData.images.some(img => img.prompter === prompter);
    if (prompterExists) {
      return res.status(400).json({ error: 'This prompter already uploaded an image' });
    }
    
    votesData.images.push({
      id: req.file.filename,
      prompter: prompter,
      prompterNumber: prompterNumber, // Add prompter number to stored data
      url: imageUrl,
      votes: 0
    });
    
    fs.writeJsonSync(votesFilePath, votesData);
    
    res.status(200).json({ 
      success: true, 
      image: {
        id: req.file.filename,
        prompter: prompter,
        prompterNumber: prompterNumber,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// Get all images
app.get('/api/images', (req, res) => {
  try {
    const votesData = fs.readJsonSync(votesFilePath);
    res.status(200).json(votesData.images);
  } catch (error) {
    console.error('Error getting images:', error);
    res.status(500).json({ error: 'Failed to get images' });
  }
});

// Vote for an image
app.post('/api/vote/:imageId', (req, res) => {
  try {
    const { imageId } = req.params;
    const votesData = fs.readJsonSync(votesFilePath);
    
    const imageIndex = votesData.images.findIndex(img => img.id === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    votesData.images[imageIndex].votes += 1;
    fs.writeJsonSync(votesFilePath, votesData);
    
    res.status(200).json({ 
      success: true, 
      image: votesData.images[imageIndex]
    });
  } catch (error) {
    console.error('Voting error:', error);
    res.status(500).json({ error: 'Failed to register vote' });
  }
});

// Delete image (Admin function)
app.delete('/api/delete/:imageId', (req, res) => {
  try {
    const { imageId } = req.params;
    const votesData = fs.readJsonSync(votesFilePath);
    
    const imageIndex = votesData.images.findIndex(img => img.id === imageId);
    if (imageIndex === -1) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    // Get the image path to delete the file
    const imageUrl = votesData.images[imageIndex].url;
    const imagePath = path.join(__dirname, '../public', imageUrl);
    
    // Remove from votes.json
    votesData.images.splice(imageIndex, 1);
    fs.writeJsonSync(votesFilePath, votesData);
    
    // Delete the image file if it exists
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    res.status(200).json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Reset votes for a specific prompter
app.post('/api/reset-prompter/:prompterNumber', (req, res) => {
  try {
    const { prompterNumber } = req.params;
    const votesData = fs.readJsonSync(votesFilePath);
    
    // Reset votes for the specified prompter
    votesData.images = votesData.images.map(img => {
      if (img.prompterNumber === prompterNumber || 
          // For backward compatibility with existing data
          (prompterNumber === '1' && img.prompter.toLowerCase() === 'prompter 1') ||
          (prompterNumber === '2' && img.prompter.toLowerCase() === 'prompter 2')) {
        return { ...img, votes: 0 };
      }
      return img;
    });
    
    fs.writeJsonSync(votesFilePath, votesData);
    
    res.status(200).json({ 
      success: true, 
      message: `Votes for Prompter ${prompterNumber} reset successfully` 
    });
  } catch (error) {
    console.error('Reset prompter error:', error);
    res.status(500).json({ error: 'Failed to reset prompter votes' });
  }
});

// Reset votes and images
app.post('/api/reset', (req, res) => {
  try {
    // Clear votes data
    fs.writeJsonSync(votesFilePath, { images: [] });
    
    // Optionally delete uploaded images
    const uploadsDir = path.join(__dirname, '../public/uploads');
    fs.emptyDirSync(uploadsDir);
    
    res.status(200).json({ success: true, message: 'All data reset successfully' });
  } catch (error) {
    console.error('Reset error:', error);
    res.status(500).json({ error: 'Failed to reset data' });
  }
});

// Serve the main page for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log('Access the application through the exposed port URL');
});
