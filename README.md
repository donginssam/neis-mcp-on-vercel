# NEIS MCP on Vercel

## 개요
**NEIS MCP**는 [NEIS 교육정보 개방 포털](https://open.neis.go.kr)의 데이터를 MCP(Model Context Protocol) 엔드포인트로 제공합니다.
급식 정보, 시간표, 학교 정보 등을 표준화된 API 하나로 접근할 수 있습니다.

## 설정

### 1. NEIS OpenAPI 인증키 발급
1. NEIS 교육정보 개방 포털에 로그인합니다:
   [https://open.neis.go.kr/portal/user/oauth/authorizePage.do](https://open.neis.go.kr/portal/user/oauth/authorizePage.do)
2. 로그인 후 **마이페이지 → 인증키 발급**으로 이동합니다:
   [https://open.neis.go.kr/portal/myPage/actKeyPage.do](https://open.neis.go.kr/portal/myPage/actKeyPage.do)
3. 필요한 데이터 서비스(예: 급식정보, 시간표, 학사일정)에 대해 API 키를 신청합니다.
4. 발급된 **인증키(API Key)**를 복사합니다.

### 2. Vercel로 배포
1. 저장소를 GitHub에 푸시합니다.
2. [Vercel](https://vercel.com)에서:
   - 새 프로젝트를 생성합니다.
   - 저장소를 연결합니다.
   - 환경 변수를 추가합니다:
     ```
     NEIS_API_KEY=발급받은_인증키
     ```
   - 서비스를 배포합니다.

### 3. 엔드포인트 확인
배포 완료 후 아래 주소에 접속하여 MCP 엔드포인트가 정상 동작하는지 확인합니다:
```
https://your.domain/mcp
```

## MCP 클라이언트 연결
Claude Desktop 또는 Poke 등 MCP 호환 클라이언트에 엔드포인트를 연결하여 사용합니다.
