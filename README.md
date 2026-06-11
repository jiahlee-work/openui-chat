# Open UI Chat

Open UI Chat은 [OpenUI](https://www.openui.com/docs)의 스트리밍 기반 Generative UI를 활용해 LLM과 실시간으로 상호작용하는 채팅 인터페이스입니다. <br/>
스트리밍되는 LLM 응답을 화면에 순차적으로 렌더링하고, 텍스트 응답을 넘어 다양한 UI 컴포넌트로 표현할 수 있도록 구성했습니다. <br/>
Next.js App Router를 기반으로 구현했으며, 서버·클라이언트 경계를 활용해 화면 렌더링, 대화 흐름, LLM 및 외부 API 통신의 책임을 분리합니다.

## 시작하기

의존성을 설치하고 개발 서버를 실행합니다.

```bash
pnpm install
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 엽니다.

## 프로젝트 구조

```text
public/
  assets/           # 이미지와 아이콘 등의 정적 파일

src/
  app/              # Next.js 라우트와 레이아웃

  presentation/     # 화면과 UI 컴포넌트
  application/      # 사용자 요청에 따른 동작과 흐름
  infrastructure/   # API 통신과 외부 시스템 연동

  config/           # 실행 환경 설정
  types/            # 전역 타입 선언과 외부 모듈 타입 확장
  shared/           # 여러 영역에서 함께 사용하는 타입과 공통 기능
```

### 주요 레이어

제품 코드는 변경되는 이유와 담당하는 책임에 따라 세 레이어로 나눕니다.

- `presentation`: 사용자가 보고 조작하는 화면과 UI를 담당합니다. 메시지 입력, 스트리밍 응답
  표시, 로딩 및 오류 상태처럼 사용자에게 보이는 부분이 여기에 포함됩니다.
- `application`: 사용자 요청을 처리하고 작업 흐름을 조정합니다. 메시지 전송, 요청 취소,
  재시도처럼 사용자의 의도를 실제 동작으로 연결하는 역할을 맡습니다.
- `infrastructure`: HTTP 통신, 스트리밍 응답 처리, 외부 API 연결처럼 구체적인 기술 구현을
  담당합니다.

```text
presentation -> application -> infrastructure
```

이 표기는 일반적인 요청 처리 흐름과 소스 코드의 의존 방향을 함께 나타냅니다.

사용자 입력은 `presentation`에서 시작해 `application`의 작업 흐름으로 전달되고, 외부 통신이
필요하면 `infrastructure`를 사용합니다. 처리 결과는 반대 방향으로 돌아와 화면에 표시되지만,
코드 의존성은 화살표 방향을 따릅니다. <br/>
이 방향을 유지하면 UI가 HTTP 클라이언트나 외부 API 구현을 직접 제어하지 않게 됩니다. 따라서
화면을 변경해도 통신 코드에 미치는 영향이 줄어들고, 사용하는 LLM이나 API가 바뀌더라도
애플리케이션 흐름과 UI를 비교적 안정적으로 유지할 수 있습니다. <br/>
또한 각 레이어를 독립적으로 테스트하거나 교체하기 쉬워지고, Next.js의 Server Component와
Client Component 경계를 더 명확하게 관리할 수 있습니다.
