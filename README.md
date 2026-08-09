# TouchDesigner Web Bridge

> 휴대폰 브라우저에서 터치한 좌표와 입력한 텍스트를 WebSocket으로 TouchDesigner에 보냅니다. 관객의 휴대폰을 작품의 입력 장치로 쓸 수 있습니다.

<img src="./images/client-screenshot.png" alt="연결 상태와 입력창, 전송 로그가 보이는 웹 클라이언트 화면" width="720">

받은 값은 TouchDesigner에서 원하는 파라미터에 연결해 씁니다. 예를 들어 좌표는 파티클 위치에, 입력한 글자는 Text TOP에 연결합니다.

## 구조

<img src="./images/pipeline.svg" alt="브라우저가 터치 좌표와 텍스트를 WebSocket 중계 서버 8080 포트로 보내고 TouchDesigner가 받아 매핑하는 흐름" width="880">

브라우저와 TouchDesigner는 서로 직접 연결하지 않고, 같은 중계 서버에 각자 접속합니다.

- 서버는 받은 메시지를 보낸 쪽을 뺀 모든 접속자에게 전달합니다.
- 양쪽을 구분하지 않으므로 접속 주소는 `ws://<PC 주소>:8080`으로 같습니다.
- 오가는 값은 JSON 문자열 한 줄입니다. 형식은 [TouchDesigner 연결](#touchdesigner-연결)에 있습니다.

## 실행

Node.js 22 이상이 필요합니다. 없으면 [nodejs.org](https://nodejs.org/)에서 설치합니다.

```bash
git clone https://github.com/devmyungduk/touchdesigner-web-bridge.git
cd touchdesigner-web-bridge
npm install
npm run dev
```

`npm install` 한 번으로 웹 화면과 서버 의존성이 함께 설치되고, `npm run dev` 한 명령으로 둘 다 실행됩니다.

서버가 뜨면 접속 주소가 출력됩니다.

```
WebSocket 서버: ws://localhost:8080
같은 네트워크에서 접속할 주소:
  ws://192.168.0.10:8080   (웹 화면은 http://192.168.0.10:3000)
```

PC에서는 `http://localhost:3000`을 엽니다. 오른쪽 위 표시가 `연결됨`이면 준비 완료입니다.

따로 실행하려면 `npm run dev:client`와 `npm run dev:server`를 씁니다.

## 휴대폰에서 접속

터미널에 출력된 `http://<주소>:3000`을 같은 공유기에 연결된 휴대폰에서 엽니다. 웹 화면은 **자신이 열린 주소로 WebSocket을 연결**하므로 코드나 설정을 고칠 필요가 없습니다.

연결되지 않으면 다음을 확인합니다.

- PC와 휴대폰이 같은 네트워크에 있는지
- Windows 방화벽이 Node.js의 인바운드 연결을 허용하는지 (`3000`, `8080`)

## TouchDesigner 연결

[TouchDesigner](https://derivative.ca/download)를 설치합니다.

1. **WebSocket DAT**를 추가합니다.
2. `Network Address`를 `localhost`, `Network Port`를 `8080`으로 설정합니다.
3. `Active`를 켭니다.

TouchDesigner를 다른 PC에서 돌린다면 `Network Address`에 `localhost` 대신 서버가 떠 있는 PC의 주소를 넣습니다.

접속되면 브라우저가 보낸 값이 WebSocket DAT의 콜백 DAT(`onReceiveText`)로 들어옵니다.

```json
{ "type": "click", "x": 512, "y": 300, "time": "14:23:05" }
{ "type": "text",  "content": "입력한 문자열", "time": "14:23:11" }
```

콜백에서 파싱해 원하는 파라미터에 연결합니다.

```python
import json

def onReceiveText(dat, rowIndex, message):
    data = json.loads(message)
    if data['type'] == 'click':
        op('constant1').par.value0 = data['x']
        op('constant1').par.value1 = data['y']
    elif data['type'] == 'text':
        op('text1').par.text = data['content']
    return
```

## 구성

웹 화면(`client`)과 중계 서버(`server`)로 나뉩니다. 루트 `package.json`이 둘을 `workspaces`로 묶어 설치와 실행을 한 번에 처리합니다.

| 경로 | 내용 |
|---|---|
| `client/app/page.tsx` | 입력 화면과 전송 기록 |
| `client/app/layout.tsx` | 폰트와 메타데이터 |
| `server/server.js` | 중계 서버 |
| `package.json` | `workspaces` 설정과 실행 스크립트 |
| `images/` | 스크린샷과 도식 |

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · ws

## 설정

| 환경변수 | 기본값 | 용도 |
|---|---|---|
| `WS_PORT` | `8080` | 서버가 열 포트 |
| `WS_VERBOSE` | 미설정 | `1`이면 중계 내역을 콘솔에 출력 |
| `NEXT_PUBLIC_WS_PORT` | `8080` | 브라우저가 접속할 포트 |
| `NEXT_PUBLIC_WS_URL` | 미설정 | 접속 주소 직접 지정 |

포트를 바꾸려면 `WS_PORT`와 `NEXT_PUBLIC_WS_PORT`를 같은 값으로 맞춥니다.

## 문제 해결

| 증상 | 확인 |
|---|---|
| `연결 끊김`이 계속 표시됨 | 서버가 실행 중인지, 포트가 같은지 |
| `EADDRINUSE` | `8080`을 쓰는 프로세스를 종료하거나 `WS_PORT` 변경 |
| 휴대폰에서 화면이 안 열림 | 같은 네트워크인지, 방화벽이 막지 않는지 |
| TouchDesigner가 값을 못 받음 | `WS_VERBOSE=1`로 띄워 중계가 일어나는지 |
| `Cannot find module 'ws'` | 루트에서 `npm install`을 실행했는지 |

## 라이선스

이용 조건은 [LICENSE](LICENSE)에 있습니다.

질문과 오류 제보는 Issues를 이용합니다.
