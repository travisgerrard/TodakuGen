const express = require('express');
const http = require('http');
const path = require('path');
const app = express();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'client/build')));

// Custom proxy middleware that preserves the full path
app.use('/api', (req, res) => {
  console.log(`Proxying request to: http://localhost:5001${req.url}`);
  
  // Create options for the proxy request
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: 'localhost:5001'
    }
  };
  
  // Create the proxy request
  const proxyReq = http.request(options, (proxyRes) => {
    // Forward the status code
    res.statusCode = proxyRes.statusCode;
    
    // Forward the headers
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Pipe the response data
    proxyRes.pipe(res);
  });
  
  // Handle errors
  proxyReq.on('error', (e) => {
    console.error(`Proxy error: ${e.message}`);
    res.status(500).json({ error: 'Proxy error', message: e.message });
  });
  
  // If there's request body data, forward it
  if (req.body) {
    proxyReq.write(JSON.stringify(req.body));
  }
  
  // Read the request body if content-length is set
  if (req.headers['content-length']) {
    let body = [];
    req.on('data', (chunk) => {
      body.push(chunk);
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      proxyReq.write(body);
      proxyReq.end();
    });
  } else {
    // End the request if no content-length
    proxyReq.end();
  }
});

// Serve React's index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Client server running on port ${PORT}`);
  console.log(`API requests will be proxied to http://localhost:5001`);
});
