// popup.html의 DOM 요소가 모두 로드되면 이 코드가 실행됩니다.
document.addEventListener('DOMContentLoaded', () => {
    const analysisResultElement = document.getElementById('page-analysis-result');
    const reportBtn = document.getElementById('report-btn');

    // 현재 활성화된 탭의 정보를 가져옵니다.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const currentTab = tabs[0];

        if (currentTab && currentTab.url) {
            // 현재 URL을 작전 통제실(background.js)로 보내 분석을 요청합니다.
            chrome.runtime.sendMessage(
                { command: "getAnalysisResult", url: currentTab.url },
                (response) => {
                    // 작전 통제실로부터 받은 응답을 처리합니다.
                    if (chrome.runtime.lastError) {
                        // 통신 오류 발생 시
                        analysisResultElement.textContent = "통제실과 교신 중 오류 발생";
                        analysisResultElement.style.color = 'orange';
                        console.error(chrome.runtime.lastError.message);
                        return;
                    }

                    updateUI(response.status);
                }
            );
        } else {
            updateUI("UNANALYZABLE");
        }
    });

    // UI를 업데이트하는 함수
    function updateUI(status) {
        switch (status) {
            case "SAFE":
                analysisResultElement.textContent = "이 사이트는 안전한 것으로 보입니다.";
                analysisResultElement.style.color = 'green';
                break;
            case "DANGEROUS":
                analysisResultElement.textContent = "경고: 이 사이트는 블랙리스트에 등록된 위험한 사이트입니다.";
                analysisResultElement.style.color = 'red';
                break;
            case "UNANALYZABLE":
                analysisResultElement.textContent = "분석할 수 없는 페이지입니다. (예: 새 탭, 설정 페이지)";
                analysisResultElement.style.color = 'gray';
                break;
            default:
                analysisResultElement.textContent = "알 수 없는 상태입니다.";
                analysisResultElement.style.color = 'black';
        }
    }

    // '신고하기' 버튼 기능
    reportBtn.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab && tab.url) {
                console.log(`신고된 URL: ${tab.url}`);
                alert(`${tab.url}\n\n해당 사이트를 신고하는 기능은 추후 추가될 예정입니다.`);
            }
        });
    });
});