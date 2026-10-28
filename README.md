# centum-intranet-test

센텀 법무사 사무소 인트라넷 **시험 서버 배포본**입니다. GitHub Pages가 이 브랜치(main)를 그대로 보여 줍니다.

- 직원: https://nowon57.github.io/centum-intranet-test/
- 의뢰인 진행 조회: https://nowon57.github.io/centum-intranet-test/#mypage

| 파일·폴더 | 내용 |
|---|---|
| `index.html` | 화면 전체(홈페이지 + 인트라넷 + 의뢰인 진행 조회) + Supabase 연결 부품 |
| `sw.js` | 비공개 파일(사진·서류)을 로그인 정보로 받아 주는 서비스 워커 |
| `img/` | 그림 |
| `pdfjs/` | PDF 미리보기(pdf.js) |
| `robots.txt` | 검색 엔진에 안 나오게 |

여기 파일은 직접 고치지 않습니다. 원본과 배포 도구는 **비공개 저장소 `NOwon57/centum-intranet`**에 있고, 그 안의 `deploy/build_deploy.py`로 만든 결과만 여기에 올립니다.

시험용 서버입니다. 실제 의뢰인 자료는 넣지 마세요.
