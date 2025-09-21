// 1. 탐지 규칙 정의 (시그니처 기반)
const BLACKLIST = ['phishing-site.html'];

// 2. content_script.js로부터 휴리스틱 분석 결과를 받기 위한 리스너
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 메시지 타입이 맞는지 확인
    if (request.type === 'HEURISTIC_ANALYSIS_RESULT') {
        const tabId = sender.tab.id;
        
        // 해당 탭의 기존 분석 보고서를 가져옴
        chrome.storage.local.get(tabId.toString(), (data) => {
            const report = data[tabId] || { riskScore: 0, reasons: [] };
            
            // content_script가 보낸 점수와 탐지 이유를 기존 보고서에 추가
            report.riskScore += request.payload.riskScore;
            report.reasons.push(...request.payload.reasons);
            
            // 모든 점수를 합산하여 최종 등급 결정
            finalizeReport(tabId, report);
        });
    }
});

// 3. 페이지 이동 감지 및 초기 분석 실행
chrome.webNavigation.onCommitted.addListener((details) => {
    // 메인 프레임에서 페이지가 로드될 때만 실행
    if (details.frameId === 0) {
        const tabId = details.tabId;
        const url = details.url;
        
        // 새로운 페이지로 이동했으므로 분석 보고서 초기화
        let report = {
            url: url,
            riskScore: 0,
            reasons: [],
            status: 'analyzing' // 초기 상태는 '분석 중'
        };

        // 블랙리스트 검사 (빠른 1차 분석)
        for (const pattern of BLACKLIST) {
            if (url.includes(pattern)) {
                report.riskScore += 100; // 블랙리스트는 매우 높은 점수 부여
                report.reasons.push('알려진 악성 URL 패턴과 일치합니다.');
            }
        }
        
        // 초기 분석 결과를 저장
        chrome.storage.local.set({ [tabId]: report }, () => {
            // 만약 블랙리스트에 걸렸다면, 즉시 최종 판정
            if (report.riskScore > 0) {
                finalizeReport(tabId, report);
            }
        });
    }
});

// 4. 최종 보고서를 확정하고 아이콘/뱃지 업데이트
function finalizeReport(tabId, report) {
    // 최종 위험도 점수에 따라 상태 결정
    if (report.riskScore >= 100) {
        report.status = 'malicious';
    } else if (report.riskScore > 0) {
        report.status = 'suspicious';
    } else {
        report.status = 'safe';
        // 위험 요소가 하나도 없으면 안전 문구 추가
        if (report.reasons.length === 0) {
            report.reasons.push('특별한 위험 요소가 발견되지 않았습니다.');
        }
    }

    // 최종 보고서를 저장하고 아이콘 업데이트
    chrome.storage.local.set({ [tabId]: report });
    updateIcon(tabId, report.status);
}

// 5. 아이콘 상태 업데이트 함수
function updateIcon(tabId, status) {
    const iconPath = status === 'malicious' ? 'images/icon48-danger.png' : 'images/icon48.png';
    const badgeText = status === 'malicious' ? 'X' : (status === 'suspicious' ? '!' : '');
    const badgeColor = status === 'malicious' ? '#F44336' : '#FFC107';

    chrome.action.setIcon({ tabId, path: iconPath });
    chrome.action.setBadgeText({ tabId, text: badgeText });

    // 뱃지가 있을 때만 배경색 지정 (뱃지가 없는데 색을 지정하면 오류 발생 가능)
    if (badgeText) {
        chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
    }
}

// 6. 탭이 닫힐 때 저장된 정보 삭제
chrome.tabs.onRemoved.addListener((tabId) => {
    chrome.storage.local.remove(tabId.toString());
});