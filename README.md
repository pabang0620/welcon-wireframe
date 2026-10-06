# 웰콘 포지션매핑 와이어프레임

콘텐츠 해외진출 기업정보 구축 기획(1단계) 위탁사업의 회원가입 화면 프로토타입.

## 데모

https://pabang0620.github.io/welcon-wireframe/

## 구성

welcon.kocca.kr 실제 회원가입 화면을 클론한 정적 HTML 프로토타입이다. 서버와 저장 기능은 없고(선택 결과는 새로고침하면 사라진다), CSS·폰트·아이콘 등 정적 자산은 welcon.kocca.kr에서 실시간으로 불러온다. 오프라인에서는 정상 동작하지 않는다.

| 파일 | 내용 |
|---|---|
| `signup-step3-member-info.html` | 회원정보입력 화면에 "내 업무 프로필" 선택 위저드를 넣은 화면 |
| `position-experience.html` | 위저드만 남긴 포지션 체험 페이지 |
| `signup-step4-company-info.html`, `index.html` | 기업정보입력 화면 (위저드 없음, 두 파일은 같은 내용) |
| `genre.html` | 콘텐츠 등록의 장르·상세장르 선택 화면 |
| `work-profile/` | 위저드 코드 (`work-profile.css`, `work-profile.js`, `work-profile-data.js`, `lib/chart.umd.min.js`). 두 페이지가 공통으로 불러온다 |

## 내 업무 프로필

장르, 내가 하는 일(주/보조 포지션), 희망 파트너를 4단계 모달로 선택하고, 결과를 요약과 장르별 분포 그래프로 보여준다. 위저드 코드는 `work-profile/` 한 곳에만 있어 두 페이지가 같은 코드를 쓴다.

> 검토용 프로토타입이다. 화면에 표기된 분류 체계는 확정본이 아니다.
