// Terminal typing effect
class Terminal {
  constructor() {
    this.terminal = document.getElementById('terminal');
    this.typingLine = this.terminal.querySelector('.typing-line');
    this.command = this.typingLine.querySelector('.command');
    this.cursor = this.typingLine.querySelector('.cursor');
    this.output = this.terminal.querySelector('.output');
    
    this.commands = [
      'print("Verify Your Identity to Access PrognosisAI")',
      'check_auth_status()',
      'list_available_providers()',
      'init_oauth_flow()'
    ];
    
    this.currentCommand = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.typingSpeed = 50; // ms per character
    this.newCommandDelay = 2000; // ms before starting new command
    
    this.init();
  }
  
  init() {
    // Start the typing effect
    setTimeout(() => this.type(), 1000);
    
    // Add click event to restart animation
    this.terminal.addEventListener('click', () => {
      this.reset();
      this.type();
    });
  }
  
  type() {
    const currentCmd = this.commands[this.currentCommand % this.commands.length];
    
    if (this.isDeleting) {
      // Delete character
      this.command.textContent = currentCmd.substring(0, this.charIndex - 1);
      this.charIndex--;
    } else {
      // Type character
      this.command.textContent = currentCmd.substring(0, this.charIndex + 1);
      this.charIndex++;
    }
    
    // Determine typing speed
    let typeSpeed = this.typingSpeed;
    
    if (this.isDeleting) {
      typeSpeed /= 2; // Faster when deleting
    }
    
    // When word is complete
    if (!this.isDeleting && this.charIndex === currentCmd.length) {
      typeSpeed = this.newCommandDelay; // Pause at end
      this.isDeleting = true;
    } else if (this.isDeleting && this.charIndex === 0) {
      this.isDeleting = false;
      this.currentCommand++;
      
      // Add output for certain commands
      if (this.currentCommand > 1) {
        this.addCommandOutput(this.commands[(this.currentCommand - 1) % this.commands.length]);
      }
      
      typeSpeed = 500; // Pause before starting new word
    }
    
    setTimeout(() => this.type(), typeSpeed);
  }
  
  addCommandOutput(command) {
    let outputText = '';
    
    switch(command) {
      case 'check_auth_status()':
        outputText = 'Status: Unauthenticated\nPlease authenticate to continue.';
        break;
      case 'list_available_providers()':
        outputText = 'Available OAuth Providers:\n- GitHub\n- GitLab\n- VS Code\n- JetBrains';
        break;
      case 'init_oauth_flow()':
        outputText = 'Initiating OAuth flow...\nRedirecting to provider selection.';
        break;
      default:
        outputText = 'Command executed successfully.';
    }
    
    const outputDiv = document.createElement('div');
    outputDiv.className = 'command-output';
    outputDiv.textContent = outputText;
    
    // Add some styling based on command
    if (command.includes('check_auth_status')) {
      outputDiv.style.color = '#FF5E5B'; // Red for auth status
    } else if (command.includes('list')) {
      outputDiv.style.color = '#00F5D0'; // Teal for lists
    }
    
    this.output.appendChild(outputDiv);
    
    // Auto-scroll to bottom
    this.terminal.scrollTop = this.terminal.scrollHeight;
  }
  
  reset() {
    this.currentCommand = 0;
    this.charIndex = 0;
    this.isDeleting = false;
    this.command.textContent = '';
    this.output.innerHTML = '';
  }
}

// Initialize terminal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const terminal = new Terminal();
  
  // Add click effect to terminal
  const terminalWindow = document.querySelector('.terminal-window');
  terminalWindow.style.transition = 'transform 0.2s ease';
  
  terminalWindow.addEventListener('mousedown', () => {
    terminalWindow.style.transform = 'scale(0.98)';
  });
  
  terminalWindow.addEventListener('mouseup', () => {
    terminalWindow.style.transform = 'scale(1)';
  });
  
  terminalWindow.addEventListener('mouseleave', () => {
    terminalWindow.style.transform = 'scale(1)';
  });
});
