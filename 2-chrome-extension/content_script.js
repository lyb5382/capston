function runHeuristicAnalysis() {
    let totalRiskScore = 0;
    let reasons = [];
    const obfuscationResult = analyzeObfuscation();
    const iframeResult = analyzeHiddenIframes();
    totalRiskScore += obfuscationResult.score + iframeResult.score;
    reasons.push(...obfuscationResult.reasons, ...iframeResult.reasons);
    if (totalRiskScore > 0) {
        chrome.runtime.sendMessage({ type: 'HEURISTIC_ANALYSIS_RESULT', payload: { riskScore: totalRiskScore, reasons } });
    }
}
function analyzeObfuscation() {
    const scripts = document.querySelectorAll('script');
    let score = 0, reasons = [];
    scripts.forEach(script => {
        const content = script.textContent;
        if (content.match(/['"][a-zA-Z0-9\/+]{100,}['"]/)) { score += 10; reasons.push('의심스럽게 긴 문자열이 코드에서 발견되었습니다.'); }
        if (content.includes('eval(')) { score += 20; reasons.push("'eval()'과 같은 위험 함수가 사용되었습니다."); }
        if (content.match(/_0x[a-f0-9]{4,}/g)) { score += 15; reasons.push("일반적이지 않은 변수명 패턴(_0x...)이 발견되었습니다."); }
    });
    return { score, reasons };
}
function analyzeHiddenIframes() {
    const iframes = document.querySelectorAll('iframe');
    let hiddenCount = 0;
    iframes.forEach(iframe => {
        const styles = window.getComputedStyle(iframe);
        if (styles.display === 'none' || styles.visibility === 'hidden' || parseInt(styles.width) < 2 || parseInt(styles.height) < 2) hiddenCount++;
    });
    if (hiddenCount > 0) return { score: hiddenCount * 30, reasons: [`사용자에게 보이지 않는 숨겨진 iframe이 ${hiddenCount}개 발견되었습니다.`] };
    return { score: 0, reasons: [] };
}
runHeuristicAnalysis();