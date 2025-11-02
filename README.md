# NEIS MCP

## Overview
**NEIS MCP** exposes a Model Control Protocol (MCP) endpoint for Korean school data from the [NEIS OpenAPI](https://open.neis.go.kr).
It provides access to meals, timetables, and school information through a single standardized API.

## Setup

### 1. Get a NEIS OpenAPI Key
1. Log in to NEIS OpenAPI:
   [https://open.neis.go.kr/portal/user/oauth/authorizePage.do](https://open.neis.go.kr/portal/user/oauth/authorizePage.do)
2. After logging in, go to **마이페이지 → 인증키 발급**:
   [https://open.neis.go.kr/portal/myPage/actKeyPage.do](https://open.neis.go.kr/portal/myPage/actKeyPage.do)
3. Apply for an API key for the data services you need (e.g., 급식정보, 시간표, 학사일정).
4. Copy your issued **인증키 (API Key)**.

### 2. Deploy on Render
1. Push your repository to GitHub.
2. On [Render](https://render.com):
   - Create a **Web Service**.
   - Connect your repository.
   - Add an environment variable:
     ```
     NEIS_API_KEY=your_api_key_here
     ```
   - Deploy the service.

### 3. Verify Endpoint
After deployment, access:
```
https://your.domain/mcp
```
to confirm the MCP endpoint is running.

## Usage with MCP Client
Connect your endpoint to an MCP-compatible client such as Claude Desktop or Poke.
