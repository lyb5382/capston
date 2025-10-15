const BLACKLIST_URL = 'https://raw.githubusercontent.com/lyb5382/phishguard-db-manager/main/blacklist.json';

// --- DB 자동 업데이트 로직 ---
chrome.runtime.onInstalled.addListener(() => {
  console.log('PhishGuard: 작전 시스템 설치 완료. 초기 DB 동기화를 시작합니다.');
  updateLocalBlacklist();
  chrome.alarms.create('blacklistUpdateAlarm', { periodInMinutes: 1440 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'blacklistUpdateAlarm') {
    console.log('PhishGuard: 정기 DB 동기화 시점입니다.');
    updateLocalBlacklist();
  }
});

async function updateLocalBlacklist() {
  console.log('PhishGuard: 중앙 DB로부터 최신 첩보를 수신합니다...');
  try {
    const response = await fetch(BLACKLIST_URL);
    if (!response.ok) {
      throw new Error(`[오류] 네트워크 응답 실패: ${response.statusText}`);
    }
    const data = await response.json();

    chrome.storage.local.set({ blacklist: data.blacklist }, () => {
      console.log(`[성공] 현장 DB가 버전 ${data.version}으로 업데이트되었습니다.`);
    });

  } catch (error) {
    console.error('[치명적 오류] 현장 DB 업데이트에 실패했습니다:', error);
  }
}


// --- 실시간 URL 감지 및 차단 로직 (수정됨) ---
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isPhishing = await checkUrlAgainstBlacklist(tab.url);
    if (isPhishing) {
      console.warn(`[위험 감지] 피싱 사이트 접속 시도 차단: ${tab.url}`);
      chrome.tabs.update(tabId, { url: chrome.runtime.getURL('pages/warning.html') });
    }
  }
});

// --- [수정됨] popup.js와 통신하는 통신부 ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "getAnalysisResult") {
    checkUrlAgainstBlacklist(request.url).then(isPhishing => {
      if (isPhishing) {
        sendResponse({ status: "DANGEROUS" });
      } else {
        sendResponse({ status: "SAFE" });
      }
    });
    return true; // 비동기 응답을 위해 필수
  }
});

// --- [새롭게 추가된 공용 함수] URL 블랙리스트 검사 로직 ---
async function checkUrlAgainstBlacklist(url) {
  if (!url || !url.startsWith('http')) {
      return false; // 분석 불가 URL
  }
  try {
    const { blacklist } = await chrome.storage.local.get('blacklist');
    if (blacklist && blacklist.some(phishingUrl => url.includes(phishingUrl))) {
      return true; // 블랙리스트에 포함됨
    }
    return false; // 블랙리스트에 포함되지 않음
  } catch (error) {
    console.error("Blacklist 확인 중 오류:", error);
    return false;
  }
}