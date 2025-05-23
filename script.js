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
const API_URL = '/api/chat'; // Path to Netlify function endpoint

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
  return new Promise((resolve, reject) => {
    const maxAttempts = 10;
    let attempts = 0;

    function tryLoadVoices() {
      let voices = speechSynthesis.getVoices();

      if (voices.length !== 0) {
        voicesLoaded = true;
        resolve(voices);
      } else if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryLoadVoices, 500); // Try again after 500ms
      } else {
        console.warn('Could not load voices after multiple attempts');
        // Resolve with empty array rather than reject to prevent breaking the app
        resolve([]);
      }
    }

    // Set up the onvoiceschanged handler
    speechSynthesis.onvoiceschanged = () => {
      const voices = speechSynthesis.getVoices();
      if (voices.length !== 0) {
        voicesLoaded = true;
        resolve(voices);
      }
    };

    // Start the first attempt
    tryLoadVoices();
  });
}

// Function to get the best Indian English voice
function getIndianEnglishVoice(voices) {
  // First try: exact match for Indian English
  let indianVoice = voices.find(voice => voice.lang === 'en-IN');
  
  if (!indianVoice) {
    // Second try: name contains Indian/India and is English
    indianVoice = voices.find(voice => 
      voice.lang.startsWith('en-') && 
      (voice.name.toLowerCase().includes('indian') || 
       voice.name.toLowerCase().includes('india'))
    );
  }
  
  if (!indianVoice) {
    // Third try: any English voice with similar characteristics
    indianVoice = voices.find(voice => 
      voice.lang === 'en-GB' || 
      voice.lang === 'en-US'
    );
  }
  
  // Final fallback: any English voice or the first available voice
  return indianVoice || voices.find(voice => voice.lang.startsWith('en-')) || voices[0];
}

let controller, typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

// No need for API key check anymore - it's hardcoded

// Function to handle creator-related questions
function handleCreatorQuestion(message) {  const creatorPatterns = [
    /who (created|made|developed|built|designed) you/i,
    /who('s| is) your (creator|developer|maker|designer)/i,
    /who are you made by/i,
    /who (is|are) you/i,
    /who is hammad/i,
    /tell me about hammad/i,
    /what do you know about hammad/i,
    /who('s| is) hammad/i
  ];  // If it's a direct question about Hammad
  if (/who is hammad|tell me about hammad|what do you know about hammad|who('s| is) hammad/i.test(message)) {
    return "Hammad is a talented full-stack developer who created me. He specializes in modern web technologies and AI integration. He built me as an AI assistant to help users with various tasks, demonstrating his expertise in AI and web development.";
  }
  // For other creator-related questions
  return creatorPatterns.some(pattern => pattern.test(message)) ?
    "I am PrognosisAI, created by Hammad x Code, a talented developer who built me to assist users like you." : null;
}

// Function to send automatic welcome message
function sendWelcomeMessage() {
  // Only send welcome message if no chats exist yet
  if (chatsContainer.children.length === 0) {
    // Add chats-active class to body
    document.body.classList.add("chats-active");    // Create welcome message
    const welcomeMessage = "Hello, I'm PrognosisAI, developed by Hammad x Code! How can I assist you today?";
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

// Text-to-speech function with Indian English accent
const speakText = async (text, messageDiv) => {
  // Stop any current speech
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    // Small delay to ensure previous speech is fully cancelled
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Load voices if not already loaded
  if (!voicesLoaded) {
    await loadVoices();
  }

  // Create a new speech utterance
  const utterance = new SpeechSynthesisUtterance(text);
  currentSpeech = utterance;
  
  // Get available voices
  const voices = speechSynthesis.getVoices();
  
  // Set Indian English voice
  utterance.voice = getIndianEnglishVoice(voices);

  // Chrome fix - resume if speech gets stuck
  const resumeInfinity = setInterval(() => {
    if (speechSynthesis.speaking) speechSynthesis.resume();
  }, 5000);

  // Clear the interval when speech ends
  utterance.onend = () => {
    clearInterval(resumeInfinity);
    messageDiv.classList.remove("speaking");
    currentSpeech = null;
  };
  
  // Optimize settings for Indian English accent  utterance.volume = 1.0;
  utterance.rate = 0.95; // Slightly slower but not too slow for natural Indian English
  utterance.pitch = 1.05; // Subtle pitch adjustment for Indian accent
  // Set proper Indian English accent
  utterance.lang = 'en-IN';

  // Comprehensive event handlers
  utterance.onstart = () => {
    messageDiv.classList.add("speaking");
  };

  utterance.onerror = (event) => {
    console.warn('Speech synthesis error:', event);
    messageDiv.classList.remove("speaking");
    currentSpeech = null;
    clearInterval(resumeInfinity);

    // Try one more time with fallback settings
    if (!event.target.hasRetried) {
      event.target.hasRetried = true;
      event.target.rate = 1.0;
      event.target.pitch = 1.0;
      event.target.voice = null; // Use default system voice
      speechSynthesis.speak(event.target);
    }
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

// Format code blocks in the response
const formatCodeBlocks = async (text, textElement, botMsgDiv) => {
  textElement.innerHTML = ""; // Use innerHTML instead of textContent
  
  // More robust regex to match code blocks with language
  const parts = text.split(/(```(?:[\w-]+)?\n[\s\S]*?```)/g);
  
  // Process each part sequentially
  for (const part of parts) {
    if (part.startsWith('```')) {
      // Process code block
      const match = part.match(/```([\w-]+)?\n([\s\S]*?)```/);
      if (match) {
        const [_, language = 'javascript', code] = match;
        
        // Create container for code block
        const codeContainer = document.createElement('div');
        codeContainer.className = 'code-container';
        
        // Create header
        const codeHeader = document.createElement('div');
        codeHeader.className = 'code-header';
        
        // Add language indicator
        const langIndicator = document.createElement('div');
        langIndicator.className = 'code-language';
        langIndicator.textContent = language;
        codeHeader.appendChild(langIndicator);
        
        // Add copy button
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<span class="material-symbols-rounded">content_copy</span> Copy';
        copyButton.addEventListener('click', () => {
          navigator.clipboard.writeText(code).then(() => {
            copyButton.innerHTML = '<span class="material-symbols-rounded">check</span> Copied';
            setTimeout(() => {
              copyButton.innerHTML = '<span class="material-symbols-rounded">content_copy</span> Copy';
            }, 2000);
          });
        });
        codeHeader.appendChild(copyButton);
        
        // Add header to container
        codeContainer.appendChild(codeHeader);
        
        // Create code block
        const codeBlock = document.createElement('div');
        codeBlock.className = 'code-block';
        
        // Apply syntax highlighting based on language
        let highlightedCode = code;
        if (language === 'html') {
          highlightedCode = highlightHTML(code);
        } else if (language === 'css') {
          highlightedCode = highlightCSS(code);
        } else if (language === 'javascript' || language === 'js') {
          highlightedCode = highlightJS(code);
        }
        
        codeBlock.innerHTML = highlightedCode;
        codeContainer.appendChild(codeBlock);
        textElement.appendChild(codeContainer);
        
        // Small pause after code block
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else if (part.trim()) {
      // Process regular text with typing effect
      const textNode = document.createElement('span');
      textElement.appendChild(textNode);
      await typingEffect(part, textNode, botMsgDiv);
    }
  }
  
  // Cleanup
  botMsgDiv.classList.remove("loading");
  document.body.classList.remove("bot-responding");
};

// SIMPLIFIED syntax highlighters for production environment

// Simple syntax highlighter for HTML
function highlightHTML(code) {
  try {
    console.log("[PRODUCTION] Highlighting HTML code");

    // Make sure HTML entities are escaped
    code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Create a temporary div to hold the highlighted code
    let result = '';

    // Split the code into lines for easier processing
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Handle indentation
      const indentMatch = line.match(/^(\s+)/);
      const indent = indentMatch ? indentMatch[0].replace(/ /g, '&nbsp;') : '';

      if (indent) {
        line = line.substring(indent.length);
      }

      // Highlight tags
      line = line.replace(/(&lt;)(!DOCTYPE\s+html)(&gt;)/gi,
                          '$1<span class="code-doctype">$2</span>$3');

      line = line.replace(/(&lt;)(\/?)([\w\-]+)(.*?)(&gt;)/g,
                          '$1<span class="code-tag">$2$3</span>$4$5');

      // Highlight attributes
      line = line.replace(/(\s+)([\w\-]+)(\s*=\s*)("[^"]*"|'[^']*')/g,
                          '$1<span class="code-property">$2</span>$3<span class="code-string">$4</span>');

      // Add the processed line to the result
      result += indent + line + '\n';
    }

    return result;
  } catch (e) {
    console.error("[PRODUCTION] Error in highlightHTML:", e);
    // Return safely escaped code
    return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// Simple syntax highlighter for CSS
function highlightCSS(code) {
  try {
    console.log("[PRODUCTION] Highlighting CSS code");

    // Make sure HTML entities are escaped
    code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Create a temporary div to hold the highlighted code
    let result = '';

    // Split the code into lines for easier processing
    const lines = code.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Handle indentation
      const indentMatch = line.match(/^(\s+)/);
      const indent = indentMatch ? indentMatch[0].replace(/ /g, '&nbsp;') : '';

      if (indent) {
        line = line.substring(indent.length);
      }

      // Highlight selectors
      line = line.replace(/([\.\#]?[\w\-]+)(\s*\{)/g,
                          '<span class="code-selector">$1</span>$2');

      // Highlight properties and values
      line = line.replace(/(\s+)([\w\-]+)(\s*:\s*)([^;]+)(;?)/g,
                          '$1<span class="code-property">$2</span>$3<span class="code-value">$4</span>$5');

      // Highlight comments
      line = line.replace(/(\/\*[\s\S]*?\*\/)/g,
                          '<span class="code-comment">$1</span>');

      // Add the processed line to the result
      result += indent + line + '\n';
    }

    return result;
  } catch (e) {
    console.error("[PRODUCTION] Error in highlightCSS:", e);
    // Return safely escaped code
    return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// Simple syntax highlighter for JavaScript
function highlightJS(code) {
  try {
    console.log("[PRODUCTION] Highlighting JavaScript code");

    // Make sure HTML entities are escaped
    code = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Create a temporary div to hold the highlighted code
    let result = '';

    // Split the code into lines for easier processing
    const lines = code.split('\n');

    // Define keywords to highlight
    const keywords = ['var', 'let', 'const', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'new', 'this', 'import', 'export', 'from', 'try', 'catch', 'throw', 'async', 'await', 'break', 'case', 'continue', 'default', 'do', 'extends', 'instanceof', 'switch', 'typeof'];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Handle indentation
      const indentMatch = line.match(/^(\s+)/);
      const indent = indentMatch ? indentMatch[0].replace(/ /g, '&nbsp;') : '';

      if (indent) {
        line = line.substring(indent.length);
      }

      // Highlight strings first (to avoid conflicts with other patterns)
      line = line.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g,
                          '<span class="code-string">$1</span>');

      // Highlight comments
      line = line.replace(/(\/\/.*$)/g,
                          '<span class="code-comment">$1</span>');

      // Highlight keywords (only if they're not already inside a span)
      for (const keyword of keywords) {
        const regex = new RegExp(`\\b${keyword}\\b(?![^<]*>)`, 'g');
        line = line.replace(regex, `<span class="code-keyword">${keyword}</span>`);
      }

      // Add the processed line to the result
      result += indent + line + '\n';
    }

    return result;
  } catch (e) {
    console.error("[PRODUCTION] Error in highlightJS:", e);
    // Return safely escaped code
    return code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

// Simulate typing effect for bot responses
const typingEffect = async (text, textElement, botMsgDiv) => {
  const characters = text.split('');
  textElement.textContent = '';
  let buffer = '';
  let lastTime = Date.now();
  
  for (let i = 0; i < characters.length; i++) {
    buffer += characters[i];
    
    // Update text and scroll less frequently to improve performance
    const now = Date.now();
    if (now - lastTime > 32) { // Approximately 30fps
      textElement.textContent = buffer;
      scrollToBottom();
      lastTime = now;
    }
    
    // Much faster delays for smoother typing
    let delay = 10; // base delay (much faster now)
    
    // Quick pause after punctuation
    if ('.!?'.includes(characters[i])) {
      delay = 100; // Reduced from 500ms
    } 
    // Brief pause after comma or semicolon
    else if (',;'.includes(characters[i])) {
      delay = 50; // Reduced from 200ms
    }
    // Minimal pause for spaces
    else if (characters[i] === ' ') {
      delay = 15; // Reduced from 60ms
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  // Cleanup
  botMsgDiv.classList.remove("loading");
  document.body.classList.remove("bot-responding");
};

// Constants for API handling
const API_TIMEOUT = 30000; // 30 second timeout
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

// Make API request with retries
const makeAPIRequest = async (requestData, currentRetry = 0) => {
  try {
    // Set up a timeout for the fetch request
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, API_TIMEOUT);

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
      signal: controller.signal,
    });

    // Clear timeout since request completed
    clearTimeout(timeoutId);

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error?.message || `Server error (${response.status})`);
      error.status = response.status;
      throw error;
    }

    // Validate response format
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error("Invalid response format from AI service");
    }

    return data;
  } catch (error) {
    // Handle specific error cases
    if (error.name === "AbortError") {
      throw new Error("Request timed out. The AI service is taking too long to respond.");
    }

    // Handle rate limits and server errors with retries
    if (currentRetry < MAX_RETRIES && 
        (error.status === 429 || error.status >= 500 || error.message.includes('timeout'))) {
      console.log(`Retrying request (${currentRetry + 1}/${MAX_RETRIES})...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return makeAPIRequest(requestData, currentRetry + 1);
    }

    throw error;
  }
};

// Update generateResponse to use the new API request function
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  // Create simplified request data
  const requestData = {
    contents: [{
      role: "user",
      parts: [
        { text: userData.message },
        ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])
      ]
    }]
  };

  try {
    const data = await makeAPIRequest(requestData);
    const responseText = data.candidates[0].content.parts[0].text.replace(/\*\*([^\*]+)\*\*/g, "$1").trim();

    // Add to chat history
    chatHistory.push({ role: "model", parts: [{ text: responseText }] });

    // Process the response
    await formatCodeBlocks(responseText, textElement, botMsgDiv);
  } catch (error) {
    console.error("Error in generateResponse:", error);
    
    let errorMessage = "An error occurred. Please try again later.";
    if (error.message.includes('timeout')) {
      errorMessage = "The request timed out. Please try again with a shorter message.";
    } else if (error.message.includes('rate limit')) {
      errorMessage = "You've reached the rate limit. Please wait a moment before sending another message.";
    } else if (error.message.includes('Invalid response')) {
      errorMessage = "The AI service response was invalid. Please try again.";
    }

    textElement.textContent = errorMessage;
    textElement.style.color = "var(--error-color)";
    showNotification(errorMessage, "error");
  } finally {
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    userData.file = {};
  }
};

// Improved error handling with recovery options
const handleError = async (error, botMsgDiv, retry = false) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  let errorMessage;
  let canRetry = false;

  if (error.message.includes('timeout')) {
    errorMessage = "The request timed out. You can try again with a shorter message.";
    canRetry = true;
  } else if (error.message.includes('rate limit') || error.status === 429) {
    const waitTime = 30;
    errorMessage = `Rate limit reached. Please wait ${waitTime} seconds.`;
    // Auto-retry after delay
    setTimeout(() => {
      if (retry) {
        generateResponse(botMsgDiv).catch(e => handleError(e, botMsgDiv, false));
      }
    }, waitTime * 1000);
  } else if (error.message.includes('Network') || error.status >= 500) {
    errorMessage = "Connection issue. Click here to try again.";
    canRetry = true;
  } else {
    errorMessage = "An error occurred. Please try again later.";
  }

  textElement.textContent = errorMessage;
  textElement.style.color = "var(--error-color)";
  
  if (canRetry) {
    textElement.style.cursor = "pointer";
    textElement.onclick = () => {
      textElement.onclick = null;
      textElement.style.cursor = "default";
      generateResponse(botMsgDiv).catch(e => handleError(e, botMsgDiv, false));
    };
  }

  showNotification(errorMessage, "error");
};

// Show loading state with better feedback
const showLoadingState = (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  const loadingDots = ["⋯", ".", "..", "..."];
  let dotIndex = 0;

  // Clear existing loading interval if any
  clearInterval(typingInterval);

  // Show initial loading state
  textElement.textContent = "Thinking" + loadingDots[0];
  
  // Animate loading dots
  typingInterval = setInterval(() => {
    dotIndex = (dotIndex + 1) % loadingDots.length;
    textElement.textContent = "Thinking" + loadingDots[dotIndex];
  }, 500);

  return () => {
    clearInterval(typingInterval);
    typingInterval = null;
  };
};

// Update message handling
const handleMessage = async (userMessage) => {
  // ...existing code...
  
  const botMsgHTML = `<img class="avatar" src="/logo.jpeg" alt="HammadGenie" /> <p class="message-text"></p>`;
  const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
  chatsContainer.appendChild(botMsgDiv);
  scrollToBottom();

  const clearLoading = showLoadingState(botMsgDiv);
  
  try {
    await generateResponse(botMsgDiv);
  } catch (error) {
    handleError(error, botMsgDiv);
  } finally {
    clearLoading();
  }
};

// Add notification system
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.classList.add("notification", type);
  notification.innerHTML = `
    <span class="material-symbols-rounded">${type === "error" ? "error" : "info"}</span>
    <p>${message}</p>
  `;

  document.body.appendChild(notification);

  // Trigger animation
  setTimeout(() => notification.classList.add("show"), 100);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.classList.remove("show");
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Throttle responses to prevent spamming
const MIN_RESPONSE_DELAY = 1000; // Minimum delay between responses in ms
let lastResponseTime = 0;

// Handle the form submission
const handleFormSubmit = async (e) => {
  e.preventDefault();
  const userMessage = promptInput.value.trim();
  if (!userMessage || document.body.classList.contains("bot-responding")) return;

  // Check if enough time has passed since last response
  const now = Date.now();
  const timeSinceLastResponse = now - lastResponseTime;
  if (timeSinceLastResponse < MIN_RESPONSE_DELAY) {
    showNotification("Please wait a moment before sending another message", "info");
    return;
  }

  lastResponseTime = now;
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
    ${userData.file.data ? (userData.file.isImage ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" alt="User uploaded image" />` : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`) : ""}
  `;

  const userMsgDiv = createMessageElement(userMsgHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = userData.message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // Add a small delay before showing bot response
  await new Promise(resolve => setTimeout(resolve, 600));
  // Generate bot message HTML and add in the chat container
  const botMsgHTML = `<img class="avatar" src="/logo.jpeg" alt="PrognosisAI" /> 
    <div class="message-content">
      <p class="message-text"><span class="material-symbols-rounded thinking-icon">psychology</span> Thinking...</p>
    </div>`;
  const botMsgDiv = createMessageElement(botMsgHTML, "bot-message", "loading");
  chatsContainer.appendChild(botMsgDiv);
  scrollToBottom();
  generateResponse(botMsgDiv);
};

// File upload handling with progress
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const maxSize = 5 * 1024 * 1024; // 5MB limit

  if (file.size > maxSize) {
    showNotification("File size should not exceed 5MB", "error");
    fileInput.value = "";
    return;
  }

  // Show upload progress notification
  const progressNotification = document.createElement("div");
  progressNotification.classList.add("notification", "progress");
  progressNotification.innerHTML = `
    <span class="material-symbols-rounded">cloud_upload</span>
    <div class="progress-content">
      <p>Uploading ${file.name}</p>
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
    </div>
  `;
  document.body.appendChild(progressNotification);
  setTimeout(() => progressNotification.classList.add("show"), 100);

  const reader = new FileReader();
  reader.readAsDataURL(file);

  // Track upload progress
  reader.onprogress = (event) => {
    if (event.lengthComputable) {
      const progress = (event.loaded / event.total) * 100;
      progressNotification.querySelector(".progress-fill").style.width = `${progress}%`;
    }
  };

  reader.onload = (e) => {
    fileInput.value = "";
    const base64String = e.target.result.split(",")[1];

    // Show completion and remove progress notification
    progressNotification.classList.remove("show");
    setTimeout(() => progressNotification.remove(), 300);

    // Show success notification
    showNotification(`${file.name} uploaded successfully`, "success");

    // Show file selected indicator
    attachmentBtn.style.backgroundColor = "var(--accent-color)";
    attachmentBtn.style.color = "white";

    // Store file data
    userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage };
  };

  reader.onerror = () => {
    progressNotification.classList.remove("show");
    setTimeout(() => progressNotification.remove(), 300);
    showNotification("Error uploading file", "error");
    fileInput.value = "";
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

  // Mobile keyboard and input handling
  function initializeMobileInputHandling() {
    const promptInput = document.querySelector('.prompt-input');
    const appHeader = document.querySelector('.app-header');

    if (promptInput) {
      // Prevent zoom on double tap and preserve font size
      promptInput.style.fontSize = '16px';

      // Handle keyboard visibility
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
          const isKeyboardOpen = window.visualViewport.height < window.innerHeight;
          document.body.classList.toggle('keyboard-open', isKeyboardOpen);

          if (isKeyboardOpen) {
            // Ensure the input is visible when keyboard opens
            setTimeout(() => {
              promptInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 100);
          }
        });
      }

      // Improve focus behavior
      promptInput.addEventListener('focus', () => {
        document.body.classList.add('keyboard-open');
        requestAnimationFrame(() => {
          promptInput.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      });

      promptInput.addEventListener('blur', () => {
        document.body.classList.remove('keyboard-open');
      });

      // Prevent zoom on tap
      promptInput.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }, { passive: false });
    }
  }

  // Call the initialization function when the document loads
  document.addEventListener('DOMContentLoaded', () => {
    if (window.matchMedia("(max-width: 768px)").matches) {
      initializeMobileInputHandling();
    }
  });
}
