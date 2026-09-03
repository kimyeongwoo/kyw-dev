# kyw-dev 개발용 Codex 프롬프트

이 파일은 `kyw-dev` 유지보수자를 위한 실행 가이드다. `kyw-dev`가 사용자 프로젝트에 생성하는 영구 문서에는 포함되지 않는다.

## 첫 실행 전

1. 이 문서 묶음의 내용을 로컬 `kyw-dev` 저장소 루트에 둔다.
2. 루트 `AGENTS.md`가 적용되도록 저장소 루트에서 Codex를 시작한다.
3. 매 세션마다 이전 대화 전체를 다시 붙여 넣지 않는다. 저장소 문서를 현재 진실의 원천으로 사용한다.

## Task 작성

새 outcome을 하나 또는 최소 dependency-aware set으로 작성:

```text
$kyw-task "<outcome>"
```

이 호출은 complete `READY/READY` Task/Test pair set을 원자적으로 작성하고, 첫 eligible pair를 위한 exact `$kyw-impl NNNN` 하나를 안내한 뒤 멈춘다. 구현, permanent-document 수정, delivery 또는 자동 Skill 호출은 하지 않는다.

`$kyw-task NNNN`은 기존 `DRAFT/DRAFT` pair의 authoring/promotion에만 사용한다. 다른 상태는 안내된 exact implementation 또는 delivery Skill을 새로 호출한다.

## Task 실행과 재개

`AGENTS.md`는 저장소 불변 규칙을, 현재 Task/Test는 범위와 local evidence를, 설치된 `$kyw-impl` reference는 `DONE/PASSED`까지의 상세 구현 절차를 소유한다. 이 파일은 절차를 복제하지 않고 호출만 제공한다.

관리되는 저장소에서 정확한 Task를 실행하거나 재개:

```text
task 0001 실행해줘
```

모든 지원 표면에서 사용할 수 있는 portable form:

```text
$kyw-impl 0001
```

활성 Task를 재개하거나 가장 낮은 eligible Task를 하나 선택:

```text
task 진행해줘
```

현재 invocation 동안 미리 생성된 queue를 직렬로 진행:

```text
남은 task 계속 실행해줘
```

세 Korean alias는 구현 전용이다. Pending `STANDARD` delivery를 선택하거나 실행하지 않으며, 구현이 `DONE/PASSED`가 되면 다음 한 줄을 출력하고 continuous mode에서도 멈춘다.

```text
다음 단계: $kyw-deliver NNNN
```

번호만 바꾼다. 사용자가 새로 정한 제약이 없다면 문서 목록, lifecycle, 검증 checklist, 이전 대화를 호출에 다시 붙이지 않는다. Compact나 새 세션 이후에도 같은 짧은 호출을 사용하며, 저장소에 기록된 `Completed`, `Remaining`, `Resume Point`, `TEST.md` evidence가 재개 상태다.

## STANDARD delivery 실행과 재개

Repository-complete Task의 현재 `STANDARD` delivery만 다음 exact form으로 수행하거나 재개한다.

```text
$kyw-deliver 0001
```

Bare form, Korean alias, implicit 호출, suffix, 자동 Skill chaining, background delivery는 지원하지 않는다. 상세 Git/GitHub 절차는 설치된 `$kyw-deliver` reference 하나가 소유하며, 여기서는 복제하지 않는다. 이미 satisfied인 contract-3 Task는 immutable report-only이고 correction은 새 hard-dependent `$kyw-task "<correction outcome>"`로 작성한다.

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
