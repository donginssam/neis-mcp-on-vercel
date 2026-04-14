# NEIS MCP on Vercel

## 개요

**NEIS MCP**는 [NEIS 교육정보 개방 포털](https://open.neis.go.kr)의 데이터를 MCP(Model Context Protocol) 엔드포인트로 제공합니다.
급식 정보, 시간표, 학교 정보 등을 표준화된 API 하나로 AI 클라이언트에서 바로 활용할 수 있습니다.

이 저장소는 [@gandandev/neis-mcp](https://github.com/gandandev/neis-mcp) 코드를 Vercel로 배포할 수 있도록 수정한 버전입니다.

---

## 바로 사용하기 (공개 엔드포인트)

별도 배포 없이 아래 공개 MCP 엔드포인트를 바로 사용할 수 있습니다.

```
https://neis-mcp.vercel.app/mcp
```

### Claude에 연결하기

1. 사용자 지정 → **커넥터** → **커스텀 커넥터 추가** 선택
2. 원격 MCP 서버 URL에 `https://neis-mcp.vercel.app/mcp` 입력 후 저장

### ChatGPT에 연결하기

1. ChatGPT 설정 → **Connectors** → **Add connector** 선택
2. MCP 서버 URL에 `https://neis-mcp.vercel.app/mcp` 입력 후 저장

---

## 직접 배포하기 (Vercel)

공개 엔드포인트 대신 자신의 Vercel 프로젝트에 직접 배포할 수도 있습니다.

### 1. NEIS OpenAPI 인증키 발급

1. [NEIS 교육정보 개방 포털](https://open.neis.go.kr/portal/user/oauth/authorizePage.do)에 로그인합니다.
2. **마이페이지 → 인증키 발급**으로 이동합니다:
   [https://open.neis.go.kr/portal/myPage/actKeyPage.do](https://open.neis.go.kr/portal/myPage/actKeyPage.do)
3. API 키를 신청하고 발급된 **인증키(API Key)**를 복사합니다.

### 2. Vercel에 배포

1. 저장소를 GitHub에 푸시합니다.
2. [Vercel](https://vercel.com)에서 새 프로젝트를 생성하고 저장소를 연결합니다.
3. 환경 변수를 추가합니다:
   ```
   NEIS_API_KEY=발급받은_인증키
   ```
4. 배포를 실행합니다.

### 3. MCP 클라이언트 연결

배포 완료 후 MCP 엔드포인트를 클라이언트에 등록합니다:

```
https://your-project.vercel.app/mcp
```
