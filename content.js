// 전역 설정 객체
let settings = {
  textAlign: "center", // 기본값
};

// 설정 로드
function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["textAlign"], (result) => {
      if (result.textAlign) {
        settings.textAlign = result.textAlign;
      }
      resolve();
    });
  });
}

function improveReadability() {
  console.log("가독성 개선 시작");

  // 본문 컨테이너를 찾기 위한 새로운 선택자들
  const contentSelectors = [
    "div.IS7S7f75", // 로그에서 발견된 가능성 있는 클래스
    "div._43WwkKcx", // 여러 번 등장하는 클래스
    "div.PPsZhBgJ", // 반복되는 클래스
    "div[class*='IS7S7f75']",
    "div[class*='_43WwkKcx']",
    "div[class*='PPsZhBgJ']",
  ];

  // 먼저 광고 요소의 position을 고정
  const adElements = document.querySelectorAll(
    '[class*="ad"], [id*="ad"], [class*="advertisement"]'
  );
  adElements.forEach((ad) => {
    if (ad.style) {
      ad.style.position = "fixed";
      ad.style.right = "0";
      ad.style.zIndex = "1000";
    }
  });

  let foundElements = [];

  // 각 선택자로 요소 찾기 시도
  for (const selector of contentSelectors) {
    const elements = document.querySelectorAll(selector);
    console.log(`${selector}: ${elements.length}개 발견`);

    if (elements.length > 0) {
      // 텍스트 컨텐츠가 있는 요소만 필터링
      const textElements = Array.from(elements).filter((el) => {
        const text = el.textContent.trim();
        const hasText = text.length > 50; // 의미 있는 텍스트 길이
        const isVisible = el.offsetParent !== null; // 화면에 보이는 요소

        // 목차 관련 요소 제외 (더 엄격한 검사)
        const isExcluded =
          el.closest("div.cOoE-yXL") || // 정확한 목차 클래스
          el.closest("div.nd2Bonga") || // 정확한 목차 클래스
          el.closest('div[class*="nymejAE"]') || // 목차 항목 클래스
          el.closest('[class*="index"]') || // 목차
          el.closest('[class*="toc"]') || // 목차
          el.closest('[class*="fold"]') || // 접기
          el.closest('[class*="nav"]') || // 네비게이션
          el.closest('[class*="menu"]') || // 메뉴
          el.closest('[class*="sidebar"]') || // 사이드바
          el.closest('[class*="side-bar"]') || // 사이드바
          el.closest('[class*="popup"]') || // 팝업
          el.closest('[class*="modal"]'); // 모달

        // 목차인 경우 로그
        if (el.closest("div.cOoE-yXL") || el.closest("div.nd2Bonga")) {
          console.log("목차 요소 제외됨");
        }

        return hasText && isVisible && !isExcluded;
      });

      if (textElements.length > 0) {
        console.log(
          `${selector}에서 텍스트 컨텐츠가 있는 요소: ${textElements.length}개`
        );
        foundElements = textElements;
        break;
      }
    }
  }

  if (foundElements.length > 0) {
    console.log(`총 ${foundElements.length}개의 요소를 찾았습니다.`);
    processElements(foundElements);
  } else {
    console.log("컨텐츠 요소를 찾을 수 없습니다. 1초 후 다시 시도합니다.");
    setTimeout(improveReadability, 1000);
  }
}

function processElements(elements) {
  elements.forEach((element, index) => {
    // 이미 처리된 요소는 건너뛰기
    if (element.hasAttribute("data-readability-improved")) {
      return;
    }

    try {
      // 원본 HTML 저장
      const originalHtml = element.innerHTML;

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
      processedHtml = processedHtml.replace(/<br\s*\/?>/gi, " ");

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
        processedHtml = processedHtml.replace(`%%FOOTNOTE${index}%%`, footnote);
      });

      // 변환된 HTML이 다른 경우에만 적용
      if (originalHtml !== processedHtml) {
        element.innerHTML = processedHtml;

        // 스타일 적용 (가운데 기준 왼쪽으로 30% 이동)
        Object.assign(element.style, {
          lineHeight: "1.8",
          margin: "1.5em auto",
          maxWidth: "800px",
          padding: "0 15px",
          wordBreak: "keep-all",
          whiteSpace: "pre-line",
          display: "block",
          fontFamily: "'Noto Sans KR', sans-serif",
          textAlign: "left",
          position: "relative", // 상대 위치 설정
          left: "-30%", // 가운데 기준 왼쪽으로 30% 이동
          transform: "translateX(30%)", // 요소 자체의 너비를 고려한 이동
          zIndex: "1", // 광고보다 낮은 z-index
        });

        // 이미지 컨테이너에 대한 스타일 처리
        const imgContainers = element.querySelectorAll("div:has(img)");
        imgContainers.forEach((container) => {
          container.style.margin = "2em auto";
          container.style.textAlign = "center";
        });

        console.log(`요소 ${index} 스타일 적용됨`);
      }
    } catch (error) {
      console.error(`요소 ${index} 처리 중 오류:`, error);
    }

    // 처리 완료 표시
    element.setAttribute("data-readability-improved", "true");
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
    console.log("설정 로드 완료:", settings);

    // 페이지가 완전히 로드될 때까지 대기
    if (document.readyState !== "complete") {
      window.addEventListener("load", () => {
        setTimeout(improveReadability, 500);
      });
    } else {
      setTimeout(improveReadability, 500);
    }

    // MutationObserver 설정
    const observer = new MutationObserver((mutations) => {
      let shouldImprove = false;
      for (const mutation of mutations) {
        if (
          mutation.type === "childList" &&
          !mutation.target.closest(".wiki-index")
        ) {
          shouldImprove = true;
          break;
        }
      }
      if (shouldImprove) {
        console.log("페이지 변경 감지됨");
        setTimeout(improveReadability, 300);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    console.log("페이지 초기화 완료");
  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
  }
}

// 메시지 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "updateTextAlign") {
    settings.textAlign = message.textAlign;
    document
      .querySelectorAll("[data-readability-improved]")
      .forEach((element) => {
        element.removeAttribute("data-readability-improved");
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
window.addEventListener("scroll", debouncedImprove, { passive: true });
