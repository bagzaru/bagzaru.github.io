![[Pasted image 20260906092122.png|603]]

### 언어 및 도구
게임 엔진 및 언어: Unreal, C++
버전 관리: Git, Github
특이사항: Unreal GAS, OpenAI Codex, Claude Code
### 개발 기간
2026년 6월\~
### 소개
현재 진행중인 개인 프로젝트입니다.

AI를 활용하여 개인 프로젝트로 패링 기반의 3D 쿼터뷰 소울라이크 스타일 게임을 제작 중에 있습니다.

무기가 각각의 체력, 스태미나를 가지는 태그매치 형태로 진행되는 게임입니다.
### 주요 구현 사항
- GAS 기반 전투 시스템
- 패리
- 인벤토리/아이템 시스템
- 무기별 AbilitySystemComponent 적용, 무기 스위칭 기능 구현
	- 공격, 피격, 애니메이션, VFX 등 실제 행위와 관련된 부분은 Player의 ASC에서 처리
	- GameplayEffect, AttributeSet 등 능력치 기반 로직은 Weapon의 ASC에서 처리
	- WeaponManagerComponent가 두 ASC간 연결을 담당
- 어빌리티 별 실행 정책
	- Queued: 현재 행동 유지, 바로 실행 불가 시 대기, 큐 소유권 관리(소유권 획득 시 다른 Queued는 대기 불가)
	- Interrupt: 현재 어빌리티가 중단 가능할 경우, 현재 행동 큐를 비우고 즉시 실행 시도
	- Parallel: 현재 행동과 관계없이 동시에 실행 시도
	- SystemForced: 죽음 등 다른 어빌리티를 반드시 취소할 수 있는 어빌리티
