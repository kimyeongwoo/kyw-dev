# kyw-dev — 전역 업데이트 전 PM 검토

작성: 2026-09-06 KST. 상태: 로컬 구현·검증 완료, GitHub 검토 브랜치에서 PM 검토 대기. PM 승인을 받았다는 의미는 아니다.

구현 기준: `main`, `b3b968d24a4b0eae6fd688791b436d8bffd60e1a`. 제품 변경 44개 파일과 명세·이 검토 요약을 `feat/taskless-workflows-and-project-ci` 브랜치의 draft PR로 검토한다. 사용자가 후속으로 GitHub 소스 반영을 요청했으므로 커밋·push·PR 준비는 현재 승인 범위에 포함된다. 최초 명세의 로컬 전용 범위는 당시 구현 요청의 기록으로 보존한다. 제품/플러그인 버전은 `0.2.3`이며 명세 원본 바이트는 그대로다. 병합·npm 게시·태그/Release·workflow 수동 실행·실제 전역 설치/업데이트는 이번 검토 반영 범위에 포함하지 않는다.

## 검토할 결과

| 개선 | 구현과 확인 지점 |
|---|---|
| 1. 일반 병합 / 자체 게시 분리 | `src/core/pr-merge.mjs`와 공유 adapter의 `check-pr`/`merge-pr`. 프로젝트의 현재 GitHub 정책·head/base·필수 검사·리뷰 상태를 사용하고 expected head로 병합/큐 등록. 자체 publisher는 canonical CI를 유지하며 다른 저장소의 쓰기를 거부한다. |
| 2. 정확한 Task 선택 | `src/core/task-artifact-queue.mjs`. 무관한 inventory 오류는 경고, 관련 ID/의존성/경로/소유권/트랜잭션 오류는 차단. 전역 할당·자동 선택 보호 유지. |
| 3. Task 없는 구현·deliver·audit | `src/core/task-artifact-delivery.mjs`, `skills/kyw-task/scripts/task-artifacts.mjs`, impl/deliver/audit 스킬. 목표/현재 요청 경로는 Task inventory를 요구하지 않으며, 변경 소유권을 판정했다고 과장하지 않는다. ID·한국어 alias·explicit-only 유지. |
| 4. 감사의 결함과 검증 한계 | `skills/kyw-audit/references/audit.md`, `skills/kyw-audit/scripts/verify.mjs`. 실제 결함·수행 검증·미실행/불확실성·완료 영향 분리. 기존 격리·원본 보존 유지. |
| 5. 검증·문서·설치 일치 | README/SPEC/ARCHITECTURE/AGENTS/스킬/템플릿과 설치 inventory를 정합화. 패키지와 hidden direct-install runtime 양쪽의 실제 adapter 경로 확인. 일회성 `docs/dev/`는 제품 format/pack 범위에서 제외해 사용자 명세를 수정하지 않았다. |

## 실제 검증과 재사용

- Windows / Node `v24.11.0` / npm `11.18.0`에서 최종 `npm run release:ci` 성공. 로컬 검토 ZIP의 `release-ci.log`에 원본 출력이 있다. ZIP은 Git에 포함하지 않는다.
- `npm test`: 475개 중 471 통과, 실패 0, 생략 4. lint 93개 module, format 393개 파일, pack 51개 파일, 실제 tarball 후보 검사 통과.
- 첫 전체 실행에서 구형 테스트 기대값 2건이 실패했다. 목표 입력과 공개 export 목록의 기대값을 수정하고, 안전성 검사는 보존·추가한 뒤 전체 재실행으로 통과했다.
- 관련 회귀: dispatch/transaction 29개, 일반 PR 28개, audit verifier 7개, audit smoke 14개, evaluator cleanup 10개 통과. 실제 tarball의 임시 설치·doctor·package/hidden-runtime adapter·uninstall 회귀도 통과했다.
- 이번 검토 묶음 준비에서는 `node ./scripts/packed-release-check.mjs --retain-candidate`로 검토할 패키지를 보존했다. 그 SHA-256이 최종 통합 검증 로그의 패키지와 완전히 일치한다. 검토 패치는 자체 소유 임시 기준 트리에 LF 설정으로 적용해 스냅샷 408개 파일의 바이트를 모두 재현했다. 같은 입력의 전체 검사는 반복하지 않았다.
- 패키지: `kyw-dev-0.2.3.tgz`, 51개 파일, 181867 bytes. SHA-256: `a56540dcdb037cd360247805049404eea6725ffeefdf33d8fecf8a5bbc59e8a3`.

## 미실행과 적용 한계

- 생략 4건: live GitHub/continuity 2건, 이 Windows 호스트의 파일 symlink 생성 및 POSIX 실행 권한 검사 각 1건.
- 구현한 GitHub 병합·게시 쓰기와 Docker 오류 경로는 테스트 대역으로 검증했다. 실제 병합·게시·Docker 컨테이너·모델 실행과 시간/토큰 절감 측정은 하지 않았다. 검토 브랜치 push/PR 생성은 소스 전달 작업이며 구현한 병합·게시 경로의 실사용 검증은 아니다. PR 생성으로 자동 실행되는 원격 CI는 PR의 실제 상태를 별도로 확인한다.
- 일반 PR adapter는 GitHub.com과 선택된 commit의 검사 100개까지 지원한다. 불완전/불명확한 응답은 외부 작업을 차단한다. base·정책의 사전 조회는 원자적이지 않으며 expected head와 서버 보호를 유지한다.
- Task 없는 경로의 실제 변경 범위 판단과 모델 행동은 스킬 지침의 영역이다. adapter/fixture 통과를 실제 모델 행동 검증이라고 주장하지 않는다.

## 전역 업데이트 전 상태

`node ./bin/kyw-dev.mjs doctor`와 읽기 전용 소유권 검사 결과, 현재 사용자 설치는 `0.2.1`이며 관리 파일 35개가 온전하다. 현재 소스 적용 예상은 추가 1개·변경 21개·유지 14개·삭제 0개다.

전체 doctor 결과는 코드 7이다. 버전 차이 경고와 별도로 Chrome 플러그인 캐시의 `latest` junction이 `UNSAFE_PLUGIN_CACHE`로 보고됐다. 이 캐시는 수정하지 않았다. 사용자 스킬의 소유권 검사에는 문제가 없으며 kyw-dev update 경로는 해당 플러그인 캐시를 수정하지 않는다. 전체 doctor가 정상이라고 보고하지 않는다.

PM 검토 후 같은 로컬 소스를 전역에 적용하려면 저장소에서 `node ./bin/kyw-dev.mjs update --scope user`가 후속 작업이다. 이 명령은 실행하지 않았으며, 명령을 기록한 것 자체가 실행 승인은 아니다. `@latest`는 이 미게시 검토 패키지와 동일하다고 가정할 수 없다. 실제 적용 시에는 검토한 소스/패키지와 설치 대상 상태를 다시 확인한다.

## 묶음 내용과 PM 확인 요청

GitHub에서는 PR의 Files changed와 이 브랜치의 소스를 검토한다. 원본 요구사항은 같은 디렉터리의 [구현 명세](KYW_DEV_IMPLEMENTATION_SPEC.md)에 있다.

별도로 만든 로컬 `pm-review-2026-09-06.zip`은 GitHub 반영 전 스냅샷이다. 그 안의 `source/`에는 tracked 파일과 새 구현 파일 2개, 총 408개 파일이 있다. `.git`과 사용자 `docs/dev/` 자료는 제외했고 명세는 `IMPLEMENTATION_SPEC.md`로 원본 복사했다. `changes.patch`, `changed-files.txt`, `source.sha256`, `package.sha256`, `release-ci.log`와 로컬 `.tgz`를 포함한다. ZIP의 작성 당시 미커밋 상태 설명과 현재 GitHub 전달 상태를 구분한다.

PM은 명세 1~5의 충족 여부, 구체적인 차단 결함과 선택 개선의 구분, 위 미실행 항목이 전역 업데이트 판단에 미치는 영향을 검토하면 된다. 남은 절차는 PM 검토와 그 이후의 명시적인 전역 업데이트다.
