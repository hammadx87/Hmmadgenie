// DOM Elements
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = document.querySelector("#file-input");
const attachmentBtn = document.querySelector("#attachment-btn");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const voiceInputBtn = document.querySelector("#voice-input-btn");

// API Setup
const API_URL = '/.netlify/functions/chat'; // Direct path to Netlify function

// Speech recognition setup
let recognition = null;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';
}

// Text-to-speech setup
const speechSynthesis = window.speechSynthesis;
let currentSpeech = null;
let voicesLoaded = false;

// Function to load and cache available voices
function loadVoices() {
  return new Promise((resolve) => {
    let voices = speechSynthesis.getVoices();

    if (voices.length !== 0) {
      voicesLoaded = true;
      resolve(voices);
    } else {
      // Wait for voices to be loaded
      speechSynthesis.onvoiceschanged = () => {
        voices = speechSynthesis.getVoices();
        voicesLoaded = true;
        resolve(voices);
      };
    }
  });
}

let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

// No need for API key check anymore - it's hardcoded

// Function to handle creator-related questions
function handleCreatorQuestion(message) {
  const creatorPatterns = [
    /who (created|made|developed|built|designed) you/i,
    /who('s| is) your (creator|developer|maker|designer)/i,
    /who are you made by/i,
    /who (is|are) you/i
  ];

  return creatorPatterns.some(pattern => pattern.test(message)) ?
    "I am HammadGenie, created by Hammad x Code, a talented developer who built me to assist users like you." : null;
}

// Function to send automatic welcome message
function sendWelcomeMessage() {
  // Only send welcome message if no chats exist yet
  if (chatsContainer.children.length === 0) {
    // Add chats-active class to body
    document.body.classList.add("chats-active");

    // Create welcome message
    const welcomeMessage = "Hello, I'm HammadGenie, developed by Hammad x Code! How can I assist you today?";
    const botMsgHTML = `<img class="avatar" src="/logo.jpeg" /> <p class="message-text">${welcomeMessage}</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message");

    // Add to chat container
    chatsContainer.appendChild(botMsgDiv);

    // Scroll to the bottom
    scrollToBottom();

    // Directly speak the welcome message
    setTimeout(() => {
      speakText(welcomeMessage, botMsgDiv);
    }, 300); // Small delay to ensure DOM is ready
  }
}

// Send welcome message when page loads
window.addEventListener('load', () => {
  // Send welcome message immediately
  setTimeout(() => {
    sendWelcomeMessage();

    // Force speech to work on some browsers that need user interaction
    if (speechSynthesis) {
      speechSynthesis.cancel(); // Reset any pending speech

      // Create and immediately speak a silent utterance to "warm up" the speech engine
      const warmup = new SpeechSynthesisUtterance(" ");
      warmup.volume = 0.01;
      speechSynthesis.speak(warmup);
    }
  }, 800); // Slightly longer delay to ensure everything is ready
});

// Set initial theme from local storage
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// Register Service Worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// Add a click event listener to the document to enable speech on first user interaction
// This helps browsers that require user interaction before allowing speech
document.addEventListener('click', function enableSpeechOnFirstClick() {
  // Create and speak a silent utterance
  if (speechSynthesis) {
    const silentUtterance = new SpeechSynthesisUtterance(' ');
    silentUtterance.volume = 0;
    speechSynthesis.speak(silentUtterance);

    // Find the first bot message
    const firstBotMessage = document.querySelector('.bot-message');
    if (firstBotMessage) {
      const messageText = firstBotMessage.querySelector('.message-text').textContent;
      // Speak the welcome message again
      setTimeout(() => {
        speakText(messageText, firstBotMessage);
      }, 100);
    }
  }

  // Remove this event listener after first click
  document.removeEventListener('click', enableSpeechOnFirstClick);
});

// Function to create message elements
const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;

  // Add speech button for bot messages
  if (classes.includes("bot-message")) {
    const speechBtn = document.createElement("button");
    speechBtn.classList.add("speech-btn", "material-symbols-rounded");
    speechBtn.textContent = "volume_up";
    speechBtn.title = "Listen to response";
    speechBtn.addEventListener("click", () => {
      const messageText = div.querySelector(".message-text").textContent;
      if (div.classList.contains("speaking")) {
        stopSpeech();
      } else {
        speakText(messageText, div);
      }
    });
    div.appendChild(speechBtn);
  }

  return div;
};

// Scroll to the bottom of the container
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

// Text-to-speech function - simplified for reliability
const speakText = (text, messageDiv) => {
  // Stop any current speech
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
  }

  // Create a new speech utterance with simple settings
  const utterance = new SpeechSynthesisUtterance(text);

  // Basic settings that work reliably
  utterance.volume = 1.0;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Simple event handlers
  utterance.onstart = () => {
    messageDiv.classList.add("speaking");
  };

  utterance.onend = () => {
    messageDiv.classList.remove("speaking");
  };

  utterance.onerror = () => {
    messageDiv.classList.remove("speaking");
  };

  // Speak immediately
  speechSynthesis.speak(utterance);
};

// Stop speech function
const stopSpeech = () => {
  if (currentSpeech) {
    speechSynthesis.cancel();
    document.querySelectorAll(".bot-message.speaking").forEach(msg => {
      msg.classList.remove("speaking");
    });
    currentSpeech = null;
  }
};

// Simulate typing effect for bot responses
const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  const words = text.split(" ");
  let wordIndex = 0;

  // Set an interval to type each word
  typingInterval = setInterval(() => {
    if (wordIndex < words.length) {
      textElement.textContent += (wordIndex === 0 ? "" : " ") + words[wordIndex++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 40); // 40 ms delay
};

// Make the API call and generate the bot's response
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  // Check for questions about Hammad or the creator
  const creatorQuestions = [
    "who is hammad",
    "who created you",
    "who developed you",
    "who made you",
    "tell me about hammad",
    "who's your creator",
    "who's your developer"
  ];
  
  if (creatorQuestions.some(q => userData.message.toLowerCase().includes(q))) {
    const creatorResponse = "I was created by Hammad, a talented full-stack developer with expertise in modern web technologies. He developed me as an AI assistant to help users with various tasks. Hammad is passionate about creating innovative solutions and enhancing user experiences through technology. I'm proud to be one of his projects!";
    typingEffect(creatorResponse, textElement, botMsgDiv);
    chatHistory.push({ role: "model", parts: [{ text: creatorResponse }] });
    return;
  }

  // API key is now hardcoded, no need to check

  // Add user message and file data to the chat history
  chatHistory.push({
    role: "user",
    parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])],
  });

  try {
    // Send the chat history to the API to get a response
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ contents: chatHistory }),
      signal: controller.signal,
    }).catch(error => {
      throw new Error("Network error: Unable to connect to the server");
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid response from server");
    }

    if (!response.ok) {
      throw new Error(data.error?.message || `Server error (${response.status})`);
    }

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response format from AI service");
    }

    // Process the response text and display with typing effect
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^\*]+)\*\*/g, "$1").trim();
    typingEffect(responseText, textElement, botMsgDiv);

    chatHistory.push({ role: "model", parts: [{ text: responseText }] });
  } catch (error) {
    textElement.textContent = error.name === "AbortError" ? "Response generation stopped." : error.message;
    textElement.style.color = "var(--error-color)";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");

    // If API key error, show the modal
    if (error.message.includes("API key")) {
      setTimeout(() => apiKeyModal.classList.add("active"), 1500);
    }

    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

// Handle the form submission
const handleFormSubmit = (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  userData.message = userMessage;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");

  // Check for creator-related questions first
  const creatorResponse = handleCreatorQuestion(userData.message);
  if (creatorResponse) {
    const botMsgHTML = `<img class="avatar" src="logo.jpeg" /> <p class="message-text">${creatorResponse}</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    speakText(creatorResponse, botMsgDiv);
    document.body.classList.remove("bot-responding");
    return;
  }

  // Generate user message HTML with optional file attachment
  const userMsgHTML = `
    <p class="message-text"></p>
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;

  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  setTimeout(() => {
    // Generate bot message HTML and add in the chat container
    const botMsgHTML = `<img class="avatar" src="/logo.jpeg" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 600); // 600 ms delay
};

// Handle file input change (file upload)
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.readAsDataURL(file);

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];

    // Show file selected indicator
    attachmentBtn.style.backgroundColor = "var(--accent-color)";
    attachmentBtn.style.color = "white";

    // Store file data in userData obj
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };
});

// Stop Bot Response
document.querySelector("#stop-response-btn").addEventListener("click", () => {
  controller?.abort();

  // Reset file data and attachment button
  userData.file = {};
  attachmentBtn.style.backgroundColor = "";
  attachmentBtn.style.color = "";

  clearInterval(typingInterval);
  chatsContainer.querySelector(".bot-message.loading").classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// Toggle dark/light theme
themeToggleBtn.addEventListener("click", () => {
  const isLightTheme = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLightTheme ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";
});

// Delete all chats
document.querySelector("#delete-chats-btn").addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");

  // Reset file data and attachment button
  userData.file = {};
  attachmentBtn.style.backgroundColor = "";
  attachmentBtn.style.color = "";
});

// Handle suggestions click
document.querySelectorAll(".suggestions-item").forEach((suggestion) => {
  suggestion.addEventListener("click", () => {
    promptInput.value = suggestion.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  });
});

// Show/hide controls for mobile on prompt input focus
document.addEventListener("click", ({ target }) => {
  const wrapper = document.querySelector(".prompt-wrapper");
  const shouldHide = target.classList.contains("prompt-input") || (wrapper.classList.contains("hide-controls") && (target.id === "attachment-btn" || target.id === "stop-response-btn"));
  wrapper.classList.toggle("hide-controls", shouldHide);
});

// Speech recognition functions
const startSpeechRecognition = () => {
  if (!recognition) return;

  // Stop any ongoing speech
  stopSpeech();

  // Clear the input field
  promptInput.value = "";

  // Start listening
  try {
    recognition.start();
    document.body.classList.add("recording");
  } catch (error) {
    console.error("Speech recognition error:", error);
  }
};

// Handle speech recognition results
if (recognition) {
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    promptInput.value = transcript;
    document.body.classList.remove("recording");
  };

  recognition.onend = () => {
    document.body.classList.remove("recording");
  };

  recognition.onerror = () => {
    document.body.classList.remove("recording");
  };
}

// No API key management needed - using hardcoded key

// Add event listeners for form submission and file input click
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#attachment-btn").addEventListener("click", () => fileInput.click());
voiceInputBtn.addEventListener("click", startSpeechRecognition);

// Mobile-specific enhancements
const isMobile = window.matchMedia("(max-width: 480px)").matches;

if (isMobile) {
  // Auto-focus input when clicking anywhere in the form area
  promptForm.addEventListener("click", (e) => {
    if (e.target === promptForm) {
      promptInput.focus();
    }
  });

  // Improve scrolling behavior on mobile
  document.querySelectorAll(".suggestions-item").forEach(item => {
    item.addEventListener("touchstart", () => {
      item.classList.add("active");
    });

    item.addEventListener("touchend", () => {
      item.classList.remove("active");
    });
  });

  // Prevent zoom on input focus for iOS
  const metaViewport = document.querySelector('meta[name=viewport]');
  if (metaViewport) {
    metaViewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
  }

  // Additional fix for iOS zoom issues
  const promptInput = document.querySelector('.prompt-input');
  if (promptInput) {
    // Prevent zoom on focus
    promptInput.addEventListener('focus', function() {
      // Add a small delay to ensure the viewport change takes effect
      setTimeout(function() {
        // Force the viewport to stay at 1.0 scale
        document.body.style.zoom = 1.0;

        // For iOS Safari
        document.documentElement.style.webkitTextSizeAdjust = '100%';

        // Scroll to make sure header is visible
        const header = document.querySelector('.app-header');
        if (header) {
          header.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    });

    // Handle keyboard showing
    promptInput.addEventListener('focus', function() {
      // Add class to body when keyboard is likely shown
      document.body.classList.add('keyboard-open');

      // Scroll to the input after a short delay to ensure it's visible
      setTimeout(function() {
        // Scroll to the bottom of the page
        window.scrollTo(0, document.body.scrollHeight);
      }, 300);
    });

    promptInput.addEventListener('blur', function() {
      // Remove class when keyboard is likely hidden
      document.body.classList.remove('keyboard-open');
    });

    // Prevent zoom on tap
    promptInput.addEventListener('touchstart', function(e) {
      if (e.touches.length > 1) {
        e.preventDefault(); // Prevent pinch zoom
      }
    }, { passive: false });
  }
}
