const BLACKLIST_URL = 'https://raw.githubusercontent.com/lyb5382/phishguard-db-manager/main/blacklist.json';

// --- DB 자동 업데이트 로직 ---
// 1. 확장 프로그램이 설치될 때
chrome.runtime.onInstalled.addListener(() => {
  console.log('PhishGuard: 작전 시스템 설치 완료. 초기 DB 동기화를 시작합니다.');
  updateLocalBlacklist();
  // 24시간(1440분)마다 업데이트 알람 설정
  chrome.alarms.create('blacklistUpdateAlarm', { periodInMinutes: 1440 });
});

// 2. 24시간마다 알람이 울릴 때
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'blacklistUpdateAlarm') {
    console.log('PhishGuard: 정기 DB 동기화 시점입니다.');
    updateLocalBlacklist();
  }
});

// 3. 실제 DB를 업데이트하는 함수
async function updateLocalBlacklist() {
  console.log('PhishGuard: 중앙 DB로부터 최신 첩보를 수신합니다...');
  try {
    const response = await fetch(BLACKLIST_URL);
    if (!response.ok) {
      throw new Error(`[오류] 네트워크 응답 실패: ${response.statusText}`);
    }
    const data = await response.json();

    // chrome.storage에 최신 블랙리스트를 저장
    chrome.storage.local.set({ blacklist: data.blacklist }, () => {
      console.log(`[성공] 현장 DB가 버전 ${data.version}으로 업데이트되었습니다.`);
    });

  } catch (error) {
    console.error('[치명적 오류] 현장 DB 업데이트에 실패했습니다:', error);
  }
}


// --- 실시간 URL 감지 및 차단 로직 ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // 탭의 URL이 변경되고 로딩이 완료되었을 때
  if (changeInfo.status === 'complete' && tab.url) {
    // 내장 DB에서 블랙리스트를 가져옴
    const { blacklist } = await chrome.storage.local.get('blacklist');

    // 블랙리스트가 존재하고, 현재 URL이 블랙리스트의 항목을 포함하는지 확인
    if (blacklist && blacklist.some(phishingUrl => tab.url.includes(phishingUrl))) {
      console.warn(`[위험 감지] 피싱 사이트 접속 시도 차단: ${tab.url}`);
      // 피싱 사이트로 판단되면 경고 페이지로 즉시 이동
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL('pages/warning.html') });
    }
  }
});

// --- [추가된 기능] popup.js로부터 오는 메시지를 수신하고 응답하는 통신부 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // popup.js로부터 'getAnalysisResult'라는 명령을 받았는지 확인
  if (request.command === "getAnalysisResult") {

    // 비동기 작업(checkUrlAgainstBlacklist)을 수행하고, 그 결과를 응답으로 보냄
    checkUrlAgainstBlacklist(request.url).then(isPhishing => {
      if (isPhishing) {
        sendResponse({ status: "DANGEROUS" }); // 위험 응답
      } else {
        sendResponse({ status: "SAFE" });      // 안전 응답
      }
    });

    // 비동기 응답을 위해 메시지 채널을 열어두겠다는 신호
    return true;
  }
});