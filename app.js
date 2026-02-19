let blocks = [
  {
    korean: "제 생각에는",
    english: "In my opinion,"
  },
  {
    korean: "이것은 매우 중요합니다.",
    english: "This is very important."
  },
  {
    korean: "많은 사람들이 사용합니다.",
    english: "Many people use it."
  },
  {
    korean: "시간과 비용을 절약할 수 있습니다.",
    english: "It can save time and money."
  }
];

let current = 0;

function showBlock() {
  if (blocks.length === 0) return;

  document.getElementById("korean").innerText = blocks[current].korean;
  document.getElementById("english").innerText = blocks[current].english;
}

function nextBlock() {
  current = (current + 1) % blocks.length;
  showBlock();
}

function prevBlock() {
  current = (current - 1 + blocks.length) % blocks.length;
  showBlock();
}

function speak() {
  const utterance = new SpeechSynthesisUtterance(blocks[current].english);
  utterance.lang = "en-US";
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

// 앱 시작
window.onload = showBlock;
