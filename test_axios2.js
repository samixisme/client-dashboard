const axios = require('axios');
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(302, { 'Location': '/secret' });
    res.end();
  } else {
    res.writeHead(200);
    res.end('secret data');
  }
});

server.listen(3000, async () => {
  try {
    const res = await axios.get('http://localhost:3000/', {
      beforeRedirect: (options) => {
        console.log('beforeRedirect called with href:', options.href);
        if (options.href.includes('secret')) {
          throw new Error('Blocked redirect');
        }
      }
    });
    console.log(res.data);
  } catch (err) {
    console.error('Caught error:', err.message);
  }
  server.close();
});
