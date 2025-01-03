// 전역 설정 객체
let settings = {
    textAlign: 'center' // 기본값
};

// 설정 로드
function loadSettings() {
    return new Promise((resolve) => {
        chrome.storage.sync.get(['textAlign'], (result) => {
            if (result.textAlign) {
                settings.textAlign = result.textAlign;
            }
            resolve();
        });
    });
}

function improveReadability() {
    console.log('가독성 개선 시작');
    
    // 나무위키의 본문 컨테이너 선택 (새로운 클래스 구조 반영)
    const contentElements = document.querySelectorAll('.nvL4lSNq, .WqA8LdCF > div');
    console.log('찾은 컨텐츠 요소 수:', contentElements.length);
    
    if (contentElements.length === 0) {
        // 다른 클래스명으로도 시도
        const alternativeElements = document.querySelectorAll('[class*="wiki-paragraph"], [class*="paragraph"]');
        if (alternativeElements.length > 0) {
            console.log('대체 요소 발견:', alternativeElements.length);
            processElements(alternativeElements);
            return;
        }
        
        console.log('컨텐츠 요소를 찾을 수 없습니다. 1초 후 다시 시도합니다.');
        setTimeout(improveReadability, 1000);
        return;
    }

    processElements(contentElements);
}

function processElements(elements) {
    elements.forEach((element, index) => {
        // 목차 내부에 있는 요소는 건너뛰기 (클래스 추가)
        if (element.closest('[class*="wiki-index"]') || 
            element.closest('[class*="wiki-folding"]') ||
            element.closest('.AP7GMySk') ||
            element.closest('._6PUcDoLt') ||
            element.querySelector('.AP7GMySk') ||
            element.querySelector('._6PUcDoLt')) {
            console.log(`목차/접기 요소 건너뜀: ${index}`);
            return;
        }

        // 이미지를 포함한 요소는 건너뛰기
        if (element.querySelector('img')) {
            console.log(`이미지 포함 요소 건너뜀: ${index}`);
            return;
        }

        // 이미 처리된 요소는 건너뛰기
        if (element.hasAttribute('data-readability-improved')) {
            return;
        }

        try {
            // 원본 HTML 저장
            const originalHtml = element.innerHTML;
            
            // 목차 관련 클래스를 포함하고 있다면 건너뛰기
            if (originalHtml.includes('AP7GMySk') || 
                originalHtml.includes('_6PUcDoLt') || 
                originalHtml.includes('_2bNY8Zs8')) {
                console.log(`목차 내용 포함 요소 건너뜀: ${index}`);
                return;
            }
            
            // 각주를 임시 태그로 대체
            let processedHtml = originalHtml;
            const footnotes = [];
            let footnoteIndex = 0;
            
            // 각주 요소를 임시 저장 (새로운 클래스명 반영)
            processedHtml = processedHtml.replace(
                /(<a[^>]*class="[^"]*(?:_9pWIVB7e|wiki-fn-content)[^"]*"[^>]*>.*?<\/a>)/g,
                (match) => {
                    footnotes.push(match);
                    return `%%FOOTNOTE${footnoteIndex++}%%`;
                }
            );
            
            // 이미 존재하는 <br> 태그 처리
            processedHtml = processedHtml.replace(/<br\s*\/?>/gi, ' ');
            
            // 먼장 끝 부호 처리 (한글 문장 부호 추가)
            processedHtml = processedHtml.replace(
                /([.!?。！？\u3002])(\s*)(?:\[([0-9]+)\])?(\s*)(?![^<>]*>)(?![0-9])/g,
                (match, punctuation, space1, citation, space2) => {
                    if (citation) {
                        return `${punctuation}[${citation}]<br><br>`;
                    }
                    return `${punctuation}<br><br>`;
                }
            );
            
            // 각주 복원
            footnotes.forEach((footnote, index) => {
                processedHtml = processedHtml.replace(
                    `%%FOOTNOTE${index}%%`,
                    footnote
                );
            });
            
            // 변환된 HTML이 다른 경우에만 적용
            if (originalHtml !== processedHtml) {
                element.innerHTML = processedHtml;
                
                // 스타일 적용
                Object.assign(element.style, {
                    textAlign: settings.textAlign,
                    lineHeight: '1.8',
                    margin: '1.5em auto',
                    maxWidth: '800px',
                    padding: '0 15px',
                    wordBreak: 'keep-all',
                    whiteSpace: 'pre-line',
                    display: 'block',
                    fontFamily: "'Noto Sans KR', sans-serif"
                });

                console.log(`요소 ${index} 스타일 적용됨`);
            }
        } catch (error) {
            console.error(`요소 ${index} 처리 중 오류:`, error);
        }

        // 처리 완료 표시
        element.setAttribute('data-readability-improved', 'true');
    });
}

// 디바운스 함수 구현
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 페이지 초기화 함수
async function initializePage() {
    try {
        await loadSettings();
        console.log('설정 로드 완료:', settings);
        
        // 페이지가 완전히 로드될 때까지 대기
        if (document.readyState !== 'complete') {
            window.addEventListener('load', () => {
                setTimeout(improveReadability, 500);
            });
        } else {
            setTimeout(improveReadability, 500);
        }
        
        // MutationObserver 설정
        const observer = new MutationObserver((mutations) => {
            let shouldImprove = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && 
                    !mutation.target.closest('.wiki-index')) {
                    shouldImprove = true;
                    break;
                }
            }
            if (shouldImprove) {
                console.log('페이지 변경 감지됨');
                setTimeout(improveReadability, 300);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('페이지 초기화 완료');
    } catch (error) {
        console.error('초기화 중 오류 발생:', error);
    }
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'updateTextAlign') {
        settings.textAlign = message.textAlign;
        document.querySelectorAll('[data-readability-improved]').forEach(element => {
            element.removeAttribute('data-readability-improved');
        });
        improveReadability();
        sendResponse({ success: true });
    }
    return true;
});

// 페이지 로드 시 초기화 실행
initializePage();

// 스크롤 이벤트 처리
const debouncedImprove = debounce(improveReadability, 300);
window.addEventListener('scroll', debouncedImprove, { passive: true }); 