# VARCO TTS Tester (Lite / Standard)

로컬에서 웹 UI로 VARCO Voice TTS(lite/standard)를 테스트하는 간단한 도구입니다.

- 브라우저에서 직접 API를 호출하면 키 노출/CORS 문제가 생길 수 있어, 로컬 서버가 `openapi.ai.nc.com`으로 프록시 요청합니다.
- 보이스 목록은 외부에서 받아오지 않고, 프로젝트에 포함된 `voice.json`을 사용합니다.

## 실행

```bash
cd varco-tts-tester
npm install
npm start
```

브라우저에서 `http://127.0.0.1:5178` 접속 후:

- `OPENAPI_KEY` 입력
- `lite` 또는 `standard` 선택
- **로컬 보이스 새로고침**으로 `voice.json` 로드/갱신
- 검색/필터로 보이스 선택 → UUID가 `voice` 입력에 자동 반영
- text 입력 후 합성 요청

## 보이스(voice.json) 사용

보이스 목록의 소스는 `varco-tts-tester/voice.json` 입니다.

프론트에서 다음 필드들을 활용해 보기 좋게 필터링/표시합니다:

- `speaker_name`: 표시 이름 (예: `실라린(중립)` → 감정 필터 후보로 사용)
- `speaker_uuid`: 합성 요청에 넣는 UUID (voice 값)
- `saas_name`: 일부 항목에만 있는 등록명/프로필명(사람 이름) 성격의 값으로 보이며, UI에서 필터(드롭다운)로 제공합니다.
- `description`: `,`로 구분된 태그 문자열 (예: `남성, 노년, 고음...`) → 성별 필터/태그 표시 등에 사용

## API (로컬 서버)

- `GET /api/voices` → `voice.json` 내용을 그대로 반환
- `GET /api/voices?reload=1` → 서버 캐시 무시하고 `voice.json` 재로딩
- `POST /api/synthesize` → VARCO TTS 합성 프록시

## 설정

- 포트: 기본 `5178` (`PORT` 환경변수로 변경 가능)

## 참고 (문서)

- Lite: `https://api.varco.ai/ko/docs/voice-text-to-speech-lite`
- Standard: `https://api.varco.ai/ko/docs/voice-text-to-speech-standard`
