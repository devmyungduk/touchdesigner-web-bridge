// 브라우저와 TouchDesigner 를 중계하는 WebSocket 서버.
//
// 한 포트에 양쪽이 접속하고, 받은 메시지를 보낸 쪽을 제외한 모든
// 접속자에게 그대로 전달한다. 역할 구분이 필요 없어 TouchDesigner 도
// 브라우저와 같은 주소를 쓴다.

const os = require('os');
const { WebSocketServer, OPEN } = require('ws');

const PORT = Number(process.env.WS_PORT ?? 8080);
const VERBOSE = process.env.WS_VERBOSE === '1';

// 같은 공유기에 있는 휴대기기가 접속할 수 있는 주소를 찾는다.
function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => net.address);
}

const wss = new WebSocketServer({ port: PORT });

wss.on('listening', () => {
  console.log(`WebSocket 서버: ws://localhost:${PORT}`);
  const addresses = lanAddresses();
  if (addresses.length > 0) {
    console.log('같은 네트워크에서 접속할 주소:');
    for (const address of addresses) {
      console.log(`  ws://${address}:${PORT}   (웹 화면은 http://${address}:3000)`);
    }
  }
});

wss.on('connection', (socket) => {
  console.log(`접속. 현재 ${wss.clients.size}개`);

  socket.on('message', (raw) => {
    const message = raw.toString();
    let relayed = 0;

    for (const client of wss.clients) {
      if (client !== socket && client.readyState === OPEN) {
        client.send(message);
        relayed += 1;
      }
    }

    if (VERBOSE) {
      console.log(`중계 ${relayed}건: ${message}`);
    }
  });

  socket.on('error', (error) => {
    console.error('소켓 오류:', error.message);
  });

  socket.on('close', () => {
    console.log(`종료. 남은 ${wss.clients.size}개`);
  });
});

wss.on('error', (error) => {
  console.error('서버 오류:', error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log('\n서버 종료');
  wss.close(() => process.exit(0));
});
