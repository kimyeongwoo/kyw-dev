# kyw-dev 개발용 Codex 프롬프트

이 파일은 `kyw-dev` 유지보수자를 위한 실행 가이드다. `kyw-dev`가 사용자 프로젝트에 생성하는 영구 문서에는 포함되지 않는다.

## 첫 실행 전

1. 이 문서 묶음의 내용을 로컬 `kyw-dev` 저장소 루트에 둔다.
2. 루트 `AGENTS.md`가 적용되도록 저장소 루트에서 Codex를 시작한다.
3. 매 세션마다 이전 대화 전체를 다시 붙여 넣지 않는다. 저장소 문서를 현재 진실의 원천으로 사용한다.
4. 현재 Task가 명백히 작은 경우가 아니라면 한 세션에 번호가 붙은 Task 하나만 수행한다.

## 최초 구현 프롬프트

아래 내용을 첫 개발 요청으로 전달한다.

```text
이 저장소에서 Codex 개발 워크플로 플러그인 kyw-dev를 구현한다.

먼저 다음 문서를 읽고 그대로 따른다.
- AGENTS.md
- README.md
- docs/SPEC.md
- docs/ARCHITECTURE.md
- docs/tasks/0001-plugin-foundation/TASK.md
- docs/tasks/0001-plugin-foundation/TEST.md

Task 0001만 수행한다. 이후 Task는 구현하지 않는다.

파일을 수정하기 전에 현재 저장소 상태와 최신 공식 Codex Plugin/Skill 요구사항을 확인한다. 공식 요구사항과 현재 문서가 충돌하면 임의로 우회하지 말고, 영향받는 영구 문서를 먼저 갱신한 뒤 그 이유를 Task 0001의 Discoveries and Changes에 기록한다.

작업 중 TASK.md와 TEST.md를 계속 최신 상태로 유지한다. 가능한 필수 검증을 실제로 모두 실행하고 정확한 결과를 기록한다. 최종 diff를 검수한 뒤 Task 0001을 PASS 또는 BLOCKED로 명확히 종료한다.
```

초기 manifest 뼈대를 만들 때 `$plugin-creator`가 사용 가능하다면 활용해도 된다. 단, 생성 결과는 반드시 `docs/ARCHITECTURE.md`와 Task 0001 기준으로 다시 검토한다.

## 다음 Task 실행 프롬프트

번호와 폴더명만 교체해서 사용한다.

```text
kyw-dev 구현을 다음 작업 단위 하나로만 계속한다.
`docs/tasks/000N-task-name/`

다음만 읽는다.
- AGENTS.md
- README.md
- docs/SPEC.md
- docs/ARCHITECTURE.md
- docs/tasks/000N-task-name/TASK.md
- docs/tasks/000N-task-name/TEST.md
- 현재 Task에서 명시적으로 참조한 의존 작업 또는 파일

수정 전에 현재 코드, git status, 관련 diff를 확인한다. 이 Task만 수행하고 이후 Task는 구현하지 않는다. 발견 사항과 구현 변경에 맞게 TASK.md와 TEST.md를 계속 갱신한다. 제품 동작, 구조, 사용법, 저장소 공통 에이전트 규칙처럼 장기 기준이 바뀌면 해당 영구 문서를 반드시 갱신한다.

완료 조건과 검증의 대응 관계를 확인하고, 필요한 명령을 실제로 실행하고, 최종 diff 검수가 끝나기 전에는 완료로 보고하지 않는다. 마지막에 PASS 또는 BLOCKED와 남은 위험을 보고한다.
```

## Compact 또는 새 세션 이후 재개 프롬프트

```text
Task 000N만 재개한다.

AGENTS.md, 네 개의 영구 문서, 현재 TASK.md와 TEST.md를 읽고 git status와 현재 diff를 확인한다. TASK.md의 Completed, Remaining, Resume Point, Decisions와 TEST.md의 Results를 인계 상태로 사용하되, 저장소 실제 상태와 일치하는지 먼저 검증한다.

처음부터 다시 수행하지 말고 다른 Task도 구현하지 않는다. 추가 compact 가능성이 생기면 그 전에 인계 항목과 테스트 상태를 먼저 갱신한다. 일반 Task 완료 게이트에 따라 종료한다.
```

## Task 없이 수행할 소규모 변경 프롬프트

```text
번호가 붙은 Task를 만들지 말고 다음의 작고 명확한 변경만 수행한다.
<요청 내용>

관련 코드를 먼저 조사하고 가장 작은 올바른 변경을 구현한 뒤 관련 검증을 실제로 실행한다. 완료 전에 AGENTS.md의 문서 영향 규칙을 적용한다.
- 동작 또는 요구사항 변경 → SPEC
- 구조 또는 의존성 변경 → ARCHITECTURE
- 설치, 설정 또는 사용법 변경 → README
- 저장소 전체 Codex 규칙 변경 → AGENTS

영향받지 않은 문서는 수정하지 않는다. 실제로 실행한 테스트와 남은 위험을 보고한다.
```

## 설명만 요청하는 프롬프트

```text
현재 저장소를 근거로 <설명할 주제>를 설명한다. 파일을 수정하거나 Task를 만들지 않는다. 저장소에서 확인한 사실과 추천 또는 추정을 구분한다.
```

## 독립 검수 프롬프트

저장소를 전혀 수정하지 않는 기본 검수에는 다음 호출을 사용한다.

```text
$kyw-audit 000N
```

이 호출은 finding, 재현 가능한 근거, scope/document/test drift, residual risk, `PASS`/`BLOCKED`를 응답으로 보고하지만 Task/Test 상태나 보고서 파일을 포함한 저장소 byte를 변경하지 않는다.

현재 Task의 명확한 범위 안 finding을 수정하도록 승인할 때만 다음 정확한 호출을 새로 사용한다.

```text
$kyw-audit 000N --fix
```

`--fix`는 finding과 변경 대상 및 검증 명령을 포함한 bounded plan이 첫 mutation 전에 제시된 뒤에만 수리를 허용한다. 자연어로 “고쳐줘”라고 덧붙이는 것은 수리 승인이 아니며, 모호하거나 범위 밖인 finding은 파일을 만들지 않는 후속 Task 제안으로만 남긴다.

## 프롬프트 전달 원칙

좋은 Task 프롬프트에는 다음만 포함한다.

- Task 식별자 또는 하나의 검증 가능한 결과;
- 저장소 문서에 아직 없는 추가 제약;
- 사용자가 새로 변경한 결정.

이전 채팅 전체를 반복해서 붙이지 않는다. 오래 유지할 결정은 SPEC, ARCHITECTURE, README, AGENTS로 승격하고, 현재 작업에서만 필요한 발견과 진행 상태는 TASK/TEST에 남긴다.
