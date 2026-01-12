# VARCO TTS Tester (Lite / Standard)

로컬에서 웹 UI로 VARCO Voice TTS(lite/standard)를 테스트하는 간단한 도구입니다.
브라우저 CORS 제약을 피하기 위해, 로컬 서버가 `openapi.ai.nc.com`으로 프록시 요청합니다.

## 실행

```bash
cd varco-tts-tester
npm install
npm start
```

브라우저에서 `http://127.0.0.1:5178` 접속 후:

- `OPENAPI_KEY` 입력
- `lite` 또는 `standard` 선택
- **보이스 목록 불러오기** 버튼으로 사용 가능한 voice 확인
- voice 선택 후 text를 넣고 합성 요청

## 참고 (문서)

- Lite: `https://api.varco.ai/ko/docs/voice-text-to-speech-lite`
- Standard: `https://api.varco.ai/ko/docs/voice-text-to-speech-standard`

