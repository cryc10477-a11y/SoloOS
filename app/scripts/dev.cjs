const { spawn } = require('node:child_process');
const http = require('node:http');

const server = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], {
  stdio: 'inherit',
  shell: true
});

function waitForVite(retries = 60) {
  return new Promise((resolve, reject) => {
    const check = () => {
      const request = http.get('http://127.0.0.1:5173', () => resolve());
      request.on('error', () => {
        if (retries <= 0) {
          reject(new Error('Vite dev server did not start in time.'));
          return;
        }
        retries -= 1;
        setTimeout(check, 500);
      });
      request.setTimeout(500, () => request.destroy());
    };
    check();
  });
}

let electron;

waitForVite()
  .then(() => {
    electron = spawn('npx', ['electron', '.'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        VITE_DEV_SERVER_URL: 'http://127.0.0.1:5173'
      }
    });

    electron.on('exit', (code) => {
      server.kill();
      process.exit(code ?? 0);
    });
  })
  .catch((error) => {
    console.error(error.message);
    server.kill();
    process.exit(1);
  });

process.on('SIGINT', () => {
  electron?.kill();
  server.kill();
  process.exit(0);
});
