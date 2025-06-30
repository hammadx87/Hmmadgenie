// OAuth Flow Simulation
document.addEventListener('DOMContentLoaded', () => {
  // Add skip authentication button handler
  function setupSkipButton() {
    const skipAuthBtn = document.getElementById('skip-auth-btn');
    if (skipAuthBtn) {
      skipAuthBtn.addEventListener('click', (e) => {
        e.preventDefault();
        console.log('Skip authentication clicked');
        // Directly set the flag and redirect
        localStorage.setItem('prognosisai_authenticated', 'true');
        window.location.href = '../index.chatbot.html';
      });
    }
  }
  
  // Run setup when DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSkipButton);
  } else {
    // DOMContentLoaded has already fired
    setupSkipButton();
  }
  
  // Get all OAuth provider buttons
  const oauthButtons = document.querySelectorAll('.oauth-button');
  const emailInput = document.querySelector('.email-input');
  const emailButton = document.querySelector('.email-button');
  const authContainer = document.querySelector('.auth-container');
  
  // Simulate OAuth flow when clicking provider buttons
  oauthButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      e.preventDefault();
      const provider = button.dataset.provider;
      
      // Add loading state
      const originalText = button.innerHTML;
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Authenticating...';
      button.style.opacity = '0.8';
      button.style.cursor = 'wait';
      
      // Simulate network delay
      setTimeout(() => {
        simulateOAuthFlow(provider);
        // Restore button state after a delay
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.opacity = '1';
          button.style.cursor = 'pointer';
        }, 1000);
      }, 1000);
    });
  });
  
  // Handle email magic link
  emailButton.addEventListener('click', (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    
    if (!validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }
    
      // Show loading state
    const originalText = emailButton.textContent;
    emailButton.disabled = true;
    emailButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    
    // Simulate API call
    setTimeout(() => {
      emailButton.innerHTML = '<i class="fas fa-check"></i> Email Sent!';
      showSuccess(`Magic link sent to ${email}. Check your inbox!`);
      
      // Reset button after delay
      setTimeout(() => {
        emailButton.disabled = false;
        emailButton.textContent = originalText;
      }, 3000);
    }, 1500);
  });
  
  // Validate email format
  function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }
  
  // Show error message
  function showError(message) {
    // Remove any existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.color = '#FF5E5B';
    errorDiv.style.marginTop = '10px';
    errorDiv.style.fontSize = '0.85rem';
    errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    authContainer.appendChild(errorDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      errorDiv.style.opacity = '0';
      setTimeout(() => errorDiv.remove(), 300);
    }, 5000);
  }
  
  // Show success message
  function showSuccess(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.style.color = '#00FF88';
    successDiv.style.marginTop = '10px';
    successDiv.style.fontSize = '0.85rem';
    successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    authContainer.appendChild(successDiv);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      successDiv.style.opacity = '0';
      setTimeout(() => successDiv.remove(), 300);
    }, 5000);
  }
  
  // Global function to be called when authentication is successful
  window.handleAuthSuccess = function() {
    // This will be overridden by the parent window
    console.log('Authentication successful!');
    // The actual redirection will be handled by the parent window
  };

  // Simulate OAuth flow with animation
  function simulateOAuthFlow(provider) {
    // Disable all buttons during auth
    oauthButtons.forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.6';
    });
    
    // Provider specific configurations
    const providerConfigs = {
      google: {
        name: 'Google',
        color: '#4285F4',
        icon: 'fab fa-google'
      },
      github: {
        name: 'GitHub',
        color: '#24292e',
        icon: 'fab fa-github'
      },
      apple: {
        name: 'Apple',
        color: '#000000',
        icon: 'fab fa-apple'
      }
    };
    
    const config = providerConfigs[provider] || { name: provider, color: '#666', icon: 'fas fa-user' };
    
    // Show loading state
    const authContainer = document.querySelector('.auth-container');
    const loadingHtml = `
      <div class="auth-loading" style="text-align: center; padding: 2rem;">
        <div class="spinner" style="width: 40px; height: 40px; margin: 0 auto 1rem; border: 4px solid #f3f3f3; border-top: 4px solid ${config.color}; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <h3>Connecting to ${config.name}...</h3>
        <p>Please wait while we redirect you to ${config.name} to complete authentication.</p>
      </div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    `;
    
    authContainer.innerHTML = loadingHtml;
    
    // Simulate API call delay
    setTimeout(() => {
      // Complete the authentication
      localStorage.setItem('prognosisai_authenticated', 'true');
      localStorage.setItem('prognosisai_provider', provider);
      button.style.backgroundColor = 'var(--primary)';
      button.style.borderColor = 'var(--primary-dark)';
      
      // Simulate successful authentication after delay
      setTimeout(() => {
        // Call the success handler
        if (window.handleAuthSuccess) {
          window.handleAuthSuccess();
        }
        showScopesConfirmation(provider);
      }, 1500); 
      
      // Reset button after delay
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.style.backgroundColor = '';
        button.style.borderColor = '';
        oauthButtons.forEach(btn => {
          btn.disabled = false;
          btn.style.opacity = '1';
        });
      }, 2000);
    }, 1500);
  }
  
  // Show scopes confirmation dialog
  function showScopesConfirmation(provider) {
    const scopes = {
      'github': ['read:user', 'user:email', 'repo (read)'],
      'gitlab': ['read_user', 'read_api'],
      'vscode': ['read:workspace', 'write:settings'],
      'jetbrains': ['read:settings', 'write:settings']
    };
    
    const providerNames = {
      'github': 'GitHub',
      'gitlab': 'GitLab',
      'vscode': 'VS Code',
      'jetbrains': 'JetBrains'
    };
    
    const modal = document.createElement('div');
    modal.className = 'scopes-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.zIndex = '1000';
    modal.style.backdropFilter = 'blur(5px)';
    
    modal.innerHTML = `
      <div class="scopes-content" style="
        background: #1E1E2C;
        border: 1px solid #333;
        border-radius: 8px;
        padding: 2rem;
        max-width: 500px;
        width: 90%;
        position: relative;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
      ">
        <h3 style="
          font-family: 'JetBrains Mono', monospace;
          color: var(--primary);
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        ">
          <i class="fab fa-${provider}"></i>
          ${providerNames[provider]} Permissions
        </h3>
        
        <p style="margin-bottom: 1.5rem; color: #E0E0E0;">
          PrognosisAI is requesting the following permissions:
        </p>
        
        <ul style="
          list-style: none;
          margin-bottom: 2rem;
          padding: 0;
        ">
          ${scopes[provider].map(scope => `
            <li style="
              padding: 0.75rem 1rem;
              background: rgba(255, 255, 255, 0.05);
              margin-bottom: 0.5rem;
              border-radius: 4px;
              display: flex;
              align-items: center;
              gap: 0.75rem;
              color: #E0E0E0;
            ">
              <i class="fas fa-check-circle" style="color: #00FF88;"></i>
              ${scope}
            </li>
          `).join('')}
        </ul>
        
        <div style="display: flex; justify-content: flex-end; gap: 1rem;">
          <button class="btn-cancel" style="
            background: none;
            border: 1px solid #666;
            color: #E0E0E0;
            padding: 0.6rem 1.5rem;
            border-radius: 4px;
            cursor: pointer;
            font-family: 'JetBrains Mono', monospace;
            transition: all 0.2s ease;
          ">
            Cancel
          </button>
          <button class="btn-authorize" style="
            background: var(--primary);
            border: none;
            color: #0A1A2F;
            padding: 0.6rem 1.5rem;
            border-radius: 4px;
            font-weight: 600;
            cursor: pointer;
            font-family: 'JetBrains Mono', monospace;
            transition: all 0.2s ease;
          ">
            Authorize
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners to buttons
    const authorizeBtn = modal.querySelector('.btn-authorize');
    const cancelBtn = modal.querySelector('.btn-cancel');
    
    authorizeBtn.addEventListener('click', () => {
      // Show success message
      showSuccess(`Successfully connected with ${providerNames[provider]}!`);
      
      // Close modal with animation
      modal.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
      
      // Redirect after delay (simulated)
      setTimeout(() => {
        // In a real app, this would redirect to the OAuth provider
        console.log(`Redirecting to ${provider} OAuth...`);
        // window.location.href = `https://auth.prognosisai.com/oauth/${provider}`;
      }, 1000);
    });
    
    cancelBtn.addEventListener('click', () => {
      // Close modal with animation
      modal.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    });
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
          document.body.removeChild(modal);
        }, 300);
      }
    });
    
    // Add animation
    setTimeout(() => {
      modal.querySelector('.scopes-content').style.opacity = '1';
      modal.querySelector('.scopes-content').style.transform = 'translateY(0)';
    }, 10);
  }
  
  // Add hover effects to OAuth buttons
  oauthButtons.forEach(button => {
    const icon = button.querySelector('i');
    const originalIcon = icon.className;
    
    button.addEventListener('mouseenter', () => {
      const provider = button.dataset.provider;
      
      // Change icon on hover
      switch(provider) {
        case 'github':
          icon.className = 'fab fa-github-alt';
          break;
        case 'gitlab':
          icon.className = 'fab fa-gitlab';
          break;
        case 'vscode':
          icon.className = 'fas fa-code';
          break;
        case 'jetbrains':
          icon.className = 'fab fa-python';
          break;
      }
      
      // Add pulse effect
      button.style.animation = 'pulse 1.5s infinite';
    });
    
    button.addEventListener('mouseleave', () => {
      // Restore original icon
      icon.className = originalIcon;
      
      // Remove pulse effect
      button.style.animation = '';
    });
  });
  
  // Add animation to code blocks
  const codeBlocks = document.querySelectorAll('pre code');
  codeBlocks.forEach(block => {
    // Add line numbers
    const lines = block.innerHTML.split('\n');
    block.innerHTML = lines.map((line, i) => {
      return `<span class="line"><span class="line-number">${i + 1}</span>${line}</span>`;
    }).join('\n');
  });
});

// Add global styles for the modal
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0.4); }
    70% { box-shadow: 0 0 0 10px rgba(0, 255, 136, 0); }
    100% { box-shadow: 0 0 0 0 rgba(0, 255, 136, 0); }
  }
  
  .scopes-content {
    opacity: 0;
    transform: translateY(20px);
    transition: all 0.3s ease;
  }
  
  .btn-cancel:hover {
    background: rgba(255, 255, 255, 0.1) !important;
  }
  
  .btn-authorize:hover {
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 12px rgba(0, 255, 136, 0.3) !important;
  }
  
  .line {
    display: block;
    min-height: 1.2em;
    position: relative;
    padding-left: 3em;
  }
  
  .line-number {
    position: absolute;
    left: 0;
    width: 2.5em;
    text-align: right;
    padding-right: 0.8em;
    color: #6A9955;
    user-select: none;
    opacity: 0.7;
  }
`;

document.head.appendChild(style);
