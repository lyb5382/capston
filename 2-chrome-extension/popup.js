document.addEventListener('DOMContentLoaded', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];
        if (!currentTab) return;

        chrome.storage.local.get(currentTab.id.toString(), (data) => {
            const result = data[currentTab.id];
            const statusBox = document.getElementById('status-box');
            const statusText = document.getElementById('status-text');
            const reasonText = document.getElementById('reason-text');

            if (result) {
                statusBox.className = 'status-box'; // 기존 클래스 초기화
                statusBox.classList.add(`status-${result.status}`);

                const statusMessages = {
                    safe: '✅ 안전',
                    suspicious: '⚠️ 주의',
                    phishing: '🚨 위험'
                };

                statusText.textContent = statusMessages[result.status];
                reasonText.textContent = result.reason;
            } else {
                statusText.textContent = "현재 페이지 정보 없음";
            }
        });
    });
});