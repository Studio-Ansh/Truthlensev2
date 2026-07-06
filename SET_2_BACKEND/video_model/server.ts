import express from 'express';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Setup multer for temporary uploads
  const uploadDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({ storage });

  // In-memory verification history
  const history: any[] = [];

  // API Routes
  app.get('/api/history', (req, res) => {
    res.json(history);
  });

  app.post('/api/verify', upload.single('video'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoPath = req.file.path;
    const reportFilename = `report-${Date.now()}.json`;
    const reportPath = path.join(uploadDir, reportFilename);

    const forceManipulated = req.body.forceManipulated === 'true' || req.body.forceManipulated === true;
    const forceAuthentic = req.body.forceAuthentic === 'true' || req.body.forceAuthentic === true;

    let command = `python3 verify_video.py --video "${videoPath}" --report "${reportPath}"`;
    if (forceManipulated) {
      command += ' --force-manipulated';
    } else if (forceAuthentic) {
      command += ' --force-authentic';
    }

    console.log(`[Server] Executing verification command: ${command}`);

    exec(command, (error, stdout, stderr) => {
      // Log outputs for debugging
      if (stdout) console.log(`[CLI STDOUT] ${stdout}`);
      if (stderr) console.error(`[CLI STDERR] ${stderr}`);

      // Even if there's an error, try to see if the report.json was written
      if (fs.existsSync(reportPath)) {
        try {
          const reportContent = fs.readFileSync(reportPath, 'utf-8');
          const reportJson = JSON.parse(reportContent);

          // Add to history list (limit to 10 items)
          history.unshift({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            fileName: req.file?.originalname || 'Uploaded Video',
            metrics: reportJson.metrics,
            forensics: reportJson.forensics,
            logs: stdout
          });
          if (history.length > 10) history.pop();

          // Cleanup files
          try {
            fs.unlinkSync(videoPath);
            fs.unlinkSync(reportPath);
          } catch (cleanupErr) {
            console.error('[Server] Cleanup error:', cleanupErr);
          }

          return res.json(reportJson);
        } catch (parseErr) {
          console.error('[Server] Failed to parse report JSON:', parseErr);
          return res.status(500).json({ error: 'Failed to generate verification report' });
        }
      } else {
        console.error('[Server] Report file was not generated.');
        // Cleanup uploaded video
        try {
          fs.unlinkSync(videoPath);
        } catch (cleanupErr) {}
        
        return res.status(500).json({ 
          error: 'Verification engine did not write a report file.',
          details: stderr || 'Unknown error'
        });
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
