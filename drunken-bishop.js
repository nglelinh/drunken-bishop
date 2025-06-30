class DrunkenBishop {
    constructor() {
        this.width = 17;
        this.height = 9;
        this.board = [];
        this.x = 8; // Start position (center)
        this.y = 4;
        this.startX = 8;
        this.startY = 4;
        this.animationSpeed = 500; // milliseconds
        this.isAnimating = false;
        this.isPaused = false;
        this.currentStep = 0;
        this.animationSteps = [];
        
        this.initializeBoard();
        this.setupEventListeners();
        this.renderBoard();
    }
    
    initializeBoard() {
        this.board = [];
        for (let y = 0; y < this.height; y++) {
            this.board[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.board[y][x] = 0;
            }
        }
        this.x = this.startX;
        this.y = this.startY;
    }
    
    setupEventListeners() {
        document.getElementById('generateBtn').addEventListener('click', () => {
            this.generateFingerprint();
        });
        
        document.getElementById('animateBtn').addEventListener('click', () => {
            this.animateFingerprint();
        });
        
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.togglePause();
        });
        
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });
        
        const speedSlider = document.getElementById('speedSlider');
        speedSlider.addEventListener('input', (e) => {
            const speed = parseInt(e.target.value);
            this.animationSpeed = 1100 - (speed * 100); // Convert to milliseconds (inverted)
            document.getElementById('speedValue').textContent = speed;
        });
        
        // Add input listener to update bytes display
        const hashInput = document.getElementById('hashInput');
        hashInput.addEventListener('input', () => {
            this.updateBytesDisplay();
        });
        
        // Initialize bytes display
        this.updateBytesDisplay();
    }
    
    hexToBytes(hex) {
        // Remove colons and convert to bytes
        const cleanHex = hex.replace(/:/g, '');
        const bytes = [];
        for (let i = 0; i < cleanHex.length; i += 2) {
            bytes.push(parseInt(cleanHex.substr(i, 2), 16));
        }
        return bytes;
    }
    
    moveBishop(direction) {
        const moves = {
            0: [-1, -1], // 00: up-left
            1: [1, -1],  // 01: up-right
            2: [-1, 1],  // 10: down-left
            3: [1, 1]    // 11: down-right
        };
        
        const [dx, dy] = moves[direction];
        let newX = this.x + dx;
        let newY = this.y + dy;
        
        // Clamp to board boundaries
        newX = Math.max(0, Math.min(this.width - 1, newX));
        newY = Math.max(0, Math.min(this.height - 1, newY));
        
        this.x = newX;
        this.y = newY;
        
        // Increment the visit count for this position
        this.board[this.y][this.x]++;
    }
    
    generateFingerprint() {
        if (this.isAnimating) return;
        
        const hashInput = document.getElementById('hashInput').value.trim();
        if (!hashInput) {// Generate a random hash if the input is empty
            const randomHash = Array.from({ length: 8 }, () => 
                Math.floor(Math.random() * 256)
                    .toString(16)
                    .padStart(2, '0')
            ).join(':');
            document.getElementById('hashInput').value = randomHash;
            this.updateBytesDisplay();
        }
        
        this.reset();
        const bytes = this.hexToBytes(hashInput || document.getElementById('hashInput').value.trim());
        
        // Process each byte
        for (const byte of bytes) {
            // Extract 4 pairs of 2 bits from each byte
            for (let i = 0; i < 4; i++) {
                const direction = (byte >> (i * 2)) & 3;
                this.moveBishop(direction);
            }
        }
        
        this.renderBoard();
        this.updateStatus('Generated', `(${this.x}, ${this.y})`, 'Complete');
    }
    
    async animateFingerprint() {
        if (this.isAnimating) return;
        
        const hashInput = document.getElementById('hashInput').value.trim();
        if (!hashInput) {
            // Generate a random hash if the input is empty
            const randomHash = Array.from({ length: 8 }, () => 
                Math.floor(Math.random() * 256)
                    .toString(16)
                    .padStart(2, '0')
            ).join(':');
            document.getElementById('hashInput').value = randomHash;
            this.updateBytesDisplay();
        }
        
        this.reset();
        this.isAnimating = true;
        this.isPaused = false;
        
        // Show pause button and hide animate button during animation
        document.getElementById('pauseBtn').style.display = 'inline-block';
        document.getElementById('animateBtn').style.display = 'none';
        
        const bytes = this.hexToBytes(hashInput || document.getElementById('hashInput').value.trim());
        let stepCount = 0;
        
        // Prepare animation steps
        this.animationSteps = [];
        for (let byteIndex = 0; byteIndex < bytes.length; byteIndex++) {
            const byte = bytes[byteIndex];
            for (let i = 0; i < 4; i++) {
                const direction = (byte >> (i * 2)) & 3;
                this.animationSteps.push({
                    byteIndex,
                    byte: byte.toString(16).padStart(2, '0').toUpperCase(),
                    direction,
                    step: stepCount++,
                    bitPair: i
                });
            }
        }
        
        // Animate each step
        for (let i = 0; i < this.animationSteps.length; i++) {
            const step = this.animationSteps[i];
            this.currentStep = i;
            
            if (!this.isAnimating) break;
            
            // Wait if paused
            await this.waitForResume();
            if (!this.isAnimating) break;
            
            // Highlight current byte in the bytes display
            this.updateBytesDisplay(step.byteIndex);
            
            // Show bit conversion for current byte and bit pair
            this.showBitConversion(step.byte, step.bitPair, step.direction);
            
            this.moveBishop(step.direction);
            this.renderBoard();
            this.updateStatus(
                `Step ${step.step + 1}/${this.animationSteps.length}`,
                `(${this.x}, ${this.y})`,
                `0x${step.byte} (bit pair ${step.bitPair + 1}/4) → ${this.getDirectionName(step.direction)}`
            );
            
            await this.sleep(this.animationSpeed);
        }
        
        this.isAnimating = false;
        this.isPaused = false;
        
        // Hide pause button and show animate button when animation ends
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('animateBtn').style.display = 'inline-block';
        
        this.updateBytesDisplay(); // Clear highlighting
        this.hideBitConversion(); // Hide bit conversion display
        this.updateStatus('Animation Complete', `(${this.x}, ${this.y})`, 'Finished');
    }
    
    getDirectionName(direction) {
        const names = ['↖', '↗', '↙', '↘'];
        return names[direction];
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    reset() {
        this.isAnimating = false;
        this.isPaused = false;
        this.currentStep = 0;
        
        // Reset button visibility
        document.getElementById('pauseBtn').style.display = 'none';
        document.getElementById('animateBtn').style.display = 'inline-block';
        document.getElementById('pauseBtn').textContent = 'Pause';
        document.getElementById('pauseBtn').style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        
        this.initializeBoard();
        this.renderBoard();
        this.updateStatus('Ready', `(${this.x}, ${this.y})`, '-');
        this.updateBytesDisplay(); // Clear highlighting
        this.hideBitConversion(); // Hide bit conversion display
    }
    
    renderBoard() {
        const boardElement = document.getElementById('board');
        boardElement.innerHTML = '';
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                
                const value = this.board[y][x];
                
                // Determine cell type and content
                if (x === this.startX && y === this.startY && value > 0) {
                    cell.classList.add('start');
                    cell.textContent = 'S';
                } else if (x === this.x && y === this.y && this.isAnimating) {
                    cell.classList.add('current');
                    cell.textContent = value > 0 ? value.toString() : '';
                } else if (x === this.x && y === this.y && !this.isAnimating && (x !== this.startX || y !== this.startY)) {
                    cell.classList.add('end');
                    cell.textContent = 'E';
                } else if (value > 0) {
                    cell.classList.add('visited');
                    cell.textContent = value.toString();
                } else {
                    cell.classList.add('empty');
                    cell.textContent = '';
                }
                
                boardElement.appendChild(cell);
            }
        }
    }
    
    updateStatus(step, position, byte) {
        document.getElementById('currentStep').textContent = step;
        document.getElementById('currentPosition').textContent = position;
        if (byte) {
            document.getElementById('currentByte').textContent = byte;
        }
    }
    
    updateBytesDisplay(currentByteIndex = -1) {
        const hashInput = document.getElementById('hashInput').value.trim();
        const bytesDisplay = document.getElementById('bytesDisplay');
        
        if (!hashInput) {
            bytesDisplay.innerHTML = '-';
            return;
        }
        
        try {
            const bytes = this.hexToBytes(hashInput);
            const bytesHTML = bytes.map((byte, index) => {
                const byteText = `${byte.toString(10).padStart(3, ' ')} (0x${byte.toString(16).padStart(2, '0').toUpperCase()})`;
                if (index === currentByteIndex) {
                    return `<span class="current-byte-highlight">${byteText}</span>`;
                }
                return byteText;
            }).join(', ');
            bytesDisplay.innerHTML = bytesHTML;
        } catch (error) {
            bytesDisplay.innerHTML = 'Invalid hex format';
        }
    }
    
    // Generate ASCII art representation (similar to SSH)
    generateASCII() {
        const chars = ' .o+=*BOX@%&#/^SE';
        let ascii = '+---[DRUNKEN BISHOP]---+\n';
        
        for (let y = 0; y < this.height; y++) {
            ascii += '|';
            for (let x = 0; x < this.width; x++) {
                let char;
                if (x === this.startX && y === this.startY) {
                    char = 'S';
                } else if (x === this.x && y === this.y) {
                    char = 'E';
                } else {
                    const value = Math.min(this.board[y][x], chars.length - 1);
                    char = chars[value];
                }
                ascii += char;
            }
            ascii += '|\n';
        }
        ascii += '+---------------------+';
        return ascii;
    }
    
    togglePause() {
        if (!this.isAnimating) return;
        
        this.isPaused = !this.isPaused;
        const pauseBtn = document.getElementById('pauseBtn');
        const animateBtn = document.getElementById('animateBtn');
        
        if (this.isPaused) {
            pauseBtn.textContent = 'Resume';
            pauseBtn.style.background = 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)';
            this.updateStatus(
                `Paused at Step ${this.currentStep + 1}/${this.animationSteps.length}`,
                `(${this.x}, ${this.y})`,
                null
            );
        } else {
            pauseBtn.textContent = 'Pause';
            pauseBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }
    }
    
    async waitForResume() {
        while (this.isPaused && this.isAnimating) {
            await this.sleep(100);
        }
    }
    
    showBitConversion(byteHex, currentBitPair, currentDirection) {
        const bitConversionElement = document.getElementById('bitConversion');
        const currentByteValue = document.getElementById('currentByteValue');
        const currentByteBinary = document.getElementById('currentByteBinary');
        const bitPairsElement = document.getElementById('bitPairs');
        
        // Show the conversion section
        bitConversionElement.style.display = 'block';
        
        const byteValue = parseInt(byteHex, 16);
        const binaryString = byteValue.toString(2).padStart(8, '0');
        
        // Update byte and binary display
        currentByteValue.textContent = `0x${byteHex} (${byteValue})`;
        currentByteBinary.textContent = binaryString;
        
        // Create bit pairs display
        bitPairsElement.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            const direction = (byteValue >> (i * 2)) & 3;
            const bits = binaryString.slice(6 - i * 2, 8 - i * 2);
            const directionArrow = this.getDirectionName(direction);
            
            const bitPairDiv = document.createElement('div');
            bitPairDiv.className = 'bit-pair';
            if (i === currentBitPair) {
                bitPairDiv.classList.add('active');
            }
            
            bitPairDiv.innerHTML = `
                <div class="bit-pair-label">Pair ${i + 1}</div>
                <div class="bit-value">${bits}</div>
                <div class="direction-arrow">${directionArrow}</div>
            `;
            
            bitPairsElement.appendChild(bitPairDiv);
        }
    }
    
    hideBitConversion() {
        document.getElementById('bitConversion').style.display = 'none';
    }
}

// Initialize the application when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new DrunkenBishop();
});

// Add some sample hashes for quick testing
const sampleHashes = [
    "16:b6:cf:0d:36:7f:77:5e:0e:9b:2f:1a:7c:4e:24:8b",
    "4a:dd:0a:c6:35:4e:3f:ed:27:38:8c:74:44:e1:a3:2d",
    "b1:94:73:d4:60:b4:b6:54:e5:c7:21:b2:24:93:49:fa",
    "2d:87:4d:12:cd:95:c2:58:59:26:83:fe:cd:01:d7:82"
];

// Add a helper function to load sample hashes
function loadSampleHash(index = 0) {
    const hashInput = document.getElementById('hashInput');
    if (hashInput && sampleHashes[index]) {
        hashInput.value = sampleHashes[index];
    }
}
