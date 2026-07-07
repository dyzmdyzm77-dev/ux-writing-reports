# UX Writing 오수정 제보 (Vercel)

에스원 UX Writing Checker 플러그인의 "이 수정안 잘못됐어요" 제보를 저장하고 열람하는 웹앱.

- `POST /api/report` — 플러그인이 제보를 보내면 Vercel Blob에 저장
- `GET  /api/list`   — 저장된 제보를 최신순으로 반환
- `POST /api/delete` — 제보 삭제 (본문 `{ url }`)
- `/` — 관리자 페이지 (제보 목록 열람/삭제)

## 저장소(Blob) 연결

Vercel 대시보드 → 이 프로젝트 → **Storage** → **Create** → **Blob** 생성 후 프로젝트에 연결하면
`BLOB_READ_WRITE_TOKEN` 환경변수가 자동으로 추가된다. 이후 재배포하면 저장이 동작한다.

관리자 페이지는 별도 키 없이 배포 주소(`/`)로 접속한다.
