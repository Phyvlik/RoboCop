// Global transcript function
function addTranscriptLine(time, speaker, text) {
    console.log('📝 Adding transcript line:', { time, speaker, text });
    
    const container = document.getElementById('transcript-container');
    if (!container) {
        console.error('❌ Transcript container not found');
        return;
    }
    
    const entry = document.createElement('div');
    entry.className = 'flex fade-in';
    
    entry.innerHTML = `
        <span class="text-xs text-gray-500 w-12">${time}</span>
        <div class="flex-1">
            <span class="text-gray-400">${speaker}:</span>
            <span class="ml-2">${text}</span>
        </div>
    `;
    
    container.appendChild(entry);
    container.scrollTop = container.scrollHeight;
    
    console.log('✅ Transcript line added successfully');
}

// Global notification function
function showNotification(message, type) {
    console.log('🔔 Showing notification:', { message, type });
    
    const notification = document.createElement('div');
    notification.className = `fixed top-20 right-4 bg-${type} text-white px-4 py-2 rounded-lg shadow-lg z-50 slide-in`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
    
    console.log('✅ Notification shown successfully');
}

// Global risk color function
function getRiskColor(level) {
    switch(level.toUpperCase()) {
        case 'CRITICAL': return 'emergency';
        case 'HIGH': return 'emergency';
        case 'MEDIUM': return 'warning';
        case 'LOW': return 'info';
        default: return 'info';
    }
}

// Global call timer function
let callStartTime = new Date();
let isCallActive = false;

function startCallTimer() {
    console.log('⏱️ Starting call timer...');
    
    // Reset call start time
    callStartTime = new Date();
    isCallActive = true;
    
    const durationElement = document.getElementById('call-duration');
    if (!durationElement) {
        console.error('❌ Call duration element not found');
        return;
    }
    
    const updateDuration = () => {
        if (!isCallActive) return;
        
        const now = new Date();
        const diff = now - callStartTime;
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        
        durationElement.textContent = 
            `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };
    
    updateDuration();
    setInterval(updateDuration, 1000);
    
    console.log('✅ Call timer started successfully');
}

// Global button selector function
function findButtonByText(text) {
    const buttons = document.querySelectorAll('button');
    for (let button of buttons) {
        if (button.textContent.includes(text)) {
            return button;
        }
    }
    return null;
}

// Global operator action function
function handleOperatorAction(action) {
    console.log('👮 Operator action:', action);
    
    if (!isConnected || !socket) {
        showNotification('Not connected to server', 'error');
        return;
    }
    
    socket.emit('operator-action', action);
    
    // Show immediate feedback
    switch (action.type) {
        case 'dispatch_ems':
            showNotification('EMS dispatched to location', 'emergency');
            break;
        case 'dispatch_police':
            showNotification('Police dispatched to location', 'warning');
            break;
        case 'escalate_call':
            showNotification('Call escalated to supervisor', 'warning');
            break;
        case 'transfer_call':
            showNotification(`Call transferred to ${action.department}`, 'info');
            break;
        case 'end_call':
            showNotification('Call ended', 'success');
            break;
        default:
            showNotification('Action processed', 'info');
    }
}

// Global AI suggestion function
function handleAISuggestion(suggestion) {
    console.log('🤖 AI suggestion:', suggestion);
    
    switch(suggestion) {
        case 'Dispatch Emergency Services':
            showNotification('Dispatching emergency services...', 'emergency');
            addTranscriptLine('01:30', 'System', 'Emergency services dispatched');
            break;
        case 'Transfer to Crisis Line':
            showNotification('Transferring to crisis hotline...', 'info');
            addTranscriptLine('01:20', 'System', 'Transferring to crisis hotline');
            break;
        case 'View Techniques':
            showDeescalationTechniques();
            break;
        default:
            showNotification(`Action: ${suggestion}`, 'info');
    }
}

// Global de-escalation techniques function
async function showDeescalationTechniques() {
    // Remove any existing modal
    const oldModal = document.getElementById('deescalation-modal');
    if (oldModal) oldModal.remove();

    // Show loading modal
    const modal = document.createElement('div');
    modal.id = 'deescalation-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-dark p-6 rounded-lg max-w-md w-full mx-4 flex flex-col items-center relative">
            <button id="close-tips-modal" class="absolute top-2 right-2 px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-500">✕</button>
            <h3 class="text-xl font-bold mb-4">De-escalation Techniques</h3>
            <div id="tips-loading" class="text-gray-300 mb-4 flex flex-col items-center">
                <span class="loader mb-2"></span>
                <span>Generating tips with Gemini AI...</span>
            </div>
            <ul id="tips-list" class="space-y-2 hidden"></ul>
        </div>
    `;
    document.body.appendChild(modal);

    // Loader CSS
    if (!document.getElementById('gemini-loader-style')) {
        const style = document.createElement('style');
        style.id = 'gemini-loader-style';
        style.textContent = `.loader { border: 4px solid #3b82f6; border-top: 4px solid #1f2937; border-radius: 50%; width: 28px; height: 28px; animation: spin 1s linear infinite; } @keyframes spin { 100% { transform: rotate(360deg); } }`;
        document.head.appendChild(style);
    }

    // Close handler
    modal.addEventListener('click', (e) => {
        if (e.target.id === 'close-tips-modal') {
            modal.remove();
        }
    });

    // Get transcript text
    let transcriptText = '';
    const transcriptContainer = document.getElementById('transcript-container');
    if (transcriptContainer) {
        transcriptText = Array.from(transcriptContainer.querySelectorAll('div')).map(div => div.textContent).join(' ');
    }

    // Call backend for Gemini tips
    let tips = [];
    try {
        const response = await fetch('/api/gemini-tips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ transcript: transcriptText })
        });
        const data = await response.json();
        tips = data.tips;
    } catch (e) {
        console.error('Gemini tips fetch error:', e);
    }

    // Fallback if Gemini fails
    if (!Array.isArray(tips) || tips.length === 0) {
        tips = [
            'Use active listening: Repeat back what the caller says to show understanding.',
            'Validate feelings: Acknowledge the caller\'s emotions without judgment.',
            'Speak calmly and slowly: Your tone can help de-escalate heightened emotions.'
        ];
    }

    // Show tips
    const tipsList = modal.querySelector('#tips-list');
    tipsList.innerHTML = tips.map(tip => `<li class="text-sm">• ${tip}</li>`).join('');
    tipsList.classList.remove('hidden');
    modal.querySelector('#tips-loading').style.display = 'none';
}

// Global notes modal function
function showNotesModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-dark p-6 rounded-lg max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4">Add Notes</h3>
            <textarea class="w-full h-32 bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="Enter your notes here..."></textarea>
            <div class="flex space-x-2 mt-4">
                <button class="px-4 py-2 bg-info text-white rounded hover:bg-blue-600">Save</button>
                <button class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    const [saveBtn, cancelBtn] = modal.querySelectorAll('button');
    saveBtn.addEventListener('click', () => {
        const notes = modal.querySelector('textarea').value;
        if (notes.trim()) {
            addTranscriptLine('01:35', 'Operator Notes', notes);
            showNotification('Notes saved', 'success');
        }
        modal.remove();
    });
    
    cancelBtn.addEventListener('click', () => {
        modal.remove();
    });
}

// Emergency Response AI Dashboard - JavaScript

class EmergencyDashboard {
    constructor() {
        this.callStartTime = new Date();
        this.transcript = [];
        this.alerts = [];
        this.isCallActive = true;
        this.operatorName = 'Vivek Patel';
        this.currentCaller = {
            name: 'Michael Rodriguez',
            phone: '+1 (555) 123-4567',
            location: '123 Main St, Apt 4B, New York, NY 10001',
            job: 'Software Engineer, TechCorp Inc.',
            issue: 'Mental health crisis, expressing suicidal thoughts'
        };
        
        // Gemini API Configuration
        this.geminiApiKey = 'AIzaSyCUr6W_oU-unb4wjjSNuWv3lzZB1wX-Ek4';
        this.geminiApiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.lastGeminiAnalysis = null;
        
        this.init();
    }

    init() {
        this.updateCurrentTime();
        this.startCallTimer();
        this.simulateRealTimeTranscript();
        this.simulateAIAnalysis();
        this.setupEventListeners();
        this.loadDummyData();
        this.startGeminiBackgroundAnalysis();
    }

    // Gemini API Integration
    async callGeminiAPI(prompt) {
        try {
            // Show Gemini is analyzing
            this.setGeminiStatus('analyzing');
            
            const response = await fetch(`${this.geminiApiUrl}?key=${this.geminiApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            
            // Show Gemini is ready
            this.setGeminiStatus('ready');
            
            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini API Error:', error);
            this.setGeminiStatus('error');
            return null;
        }
    }

    setGeminiStatus(status) {
        const statusElement = document.getElementById('gemini-status');
        if (!statusElement) return;

        // Remove existing classes
        statusElement.className = 'w-3 h-3 rounded-full mr-2';

        switch(status) {
            case 'analyzing':
                statusElement.classList.add('bg-yellow-500', 'animate-pulse');
                break;
            case 'ready':
                statusElement.classList.add('bg-green-500');
                break;
            case 'error':
                statusElement.classList.add('bg-red-500');
                break;
            default:
                statusElement.classList.add('bg-info');
        }
    }

    async analyzeEmergencyWithGemini(transcriptText) {
        const prompt = `You are an AI assistant for emergency response operators. Analyze this emergency call transcript and provide:

1. EMERGENCY LEVEL: (LOW/MEDIUM/HIGH/CRITICAL)
2. IMMEDIATE RISKS: List any immediate dangers
3. EMOTIONAL STATE: Assess caller's emotional condition
4. RECOMMENDED ACTIONS: Specific steps for the operator
5. KEYWORDS DETECTED: Important phrases or words
6. BACKGROUND NOISE: Any concerning sounds or environment clues

Transcript: "${transcriptText}"

Respond in JSON format:
{
    "emergency_level": "CRITICAL",
    "immediate_risks": ["suicidal ideation", "access to pills"],
    "emotional_state": "hopeless and desperate",
    "recommended_actions": ["dispatch EMS immediately", "keep caller engaged"],
    "keywords_detected": ["ending it all", "pills", "tired of fighting"],
    "background_noise": "sounds like caller is alone at home"
}`;

        const result = await this.callGeminiAPI(prompt);
        if (result) {
            try {
                // Extract JSON from Gemini response
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (error) {
                console.error('Error parsing Gemini response:', error);
            }
        }
        return null;
    }

    async startGeminiBackgroundAnalysis() {
        // Analyze transcript every 30 seconds with Gemini
        setInterval(async () => {
            if (!this.isCallActive || this.transcript.length === 0) return;

            const recentTranscript = this.transcript.slice(-5); // Last 5 entries
            const transcriptText = recentTranscript.map(t => `${t.speaker}: ${t.text}`).join(' ');

            const geminiAnalysis = await this.analyzeEmergencyWithGemini(transcriptText);
            if (geminiAnalysis) {
                this.updateDashboardWithGeminiAnalysis(geminiAnalysis);
                this.lastGeminiAnalysis = geminiAnalysis;
            }
        }, 30000); // Every 30 seconds
    }

    updateDashboardWithGeminiAnalysis(analysis) {
        // Update AI Analysis panel
        this.updateAIAnalysisWithGemini(analysis);
        
        // Update alerts based on Gemini analysis
        this.updateAlertsWithGemini(analysis);
        
        // Update AI suggestions
        this.updateAISuggestionsWithGemini(analysis);
        
        // Show Gemini feedback notification
        this.showGeminiFeedback(analysis);
    }

    updateAIAnalysisWithGemini(analysis) {
        const analysisContainer = document.querySelector('.grid.grid-cols-2');
        if (analysisContainer) {
            // Update Risk Level
            const riskElement = analysisContainer.querySelector('p.font-semibold.text-emergency');
            if (riskElement) {
                riskElement.textContent = analysis.emergency_level;
                riskElement.className = `font-semibold text-${this.getRiskColor(analysis.emergency_level)}`;
            }

            // Update Tone/Emotional State
            const toneElement = analysisContainer.querySelector('p.font-semibold.text-warning');
            if (toneElement) {
                toneElement.textContent = analysis.emotional_state;
            }

            // Update Situation
            const situationElement = analysisContainer.querySelector('p.font-semibold.text-emergency');
            if (situationElement && analysis.immediate_risks.length > 0) {
                situationElement.textContent = analysis.immediate_risks[0].toUpperCase();
            }
        }
    }

    updateAlertsWithGemini(analysis) {
        const alertsContainer = document.querySelector('.space-y-3');
        if (!alertsContainer) return;

        // Clear existing alerts
        const existingAlerts = alertsContainer.querySelectorAll('.bg-emergency, .bg-warning, .bg-info');
        existingAlerts.forEach(alert => alert.remove());

        // Add new alerts based on Gemini analysis
        analysis.immediate_risks.forEach(risk => {
            const alertType = this.getAlertType(risk);
            const alertElement = document.createElement('div');
            alertElement.className = `bg-${alertType} bg-opacity-20 border border-${alertType} p-3 rounded slide-in`;
            
            alertElement.innerHTML = `
                <div class="flex items-center">
                    <i class="fas fa-robot text-${alertType} mr-2"></i>
                    <span class="font-semibold text-${alertType}">AI DETECTED: ${risk.toUpperCase()}</span>
                </div>
                <p class="text-sm mt-1">Gemini AI analysis identified this risk factor</p>
            `;
            
            alertsContainer.appendChild(alertElement);
        });
    }

    updateAISuggestionsWithGemini(analysis) {
        const suggestionsContainer = document.querySelector('.bg-gray-800.p-3.rounded.border-l-4.border-emergency');
        if (suggestionsContainer) {
            const actionText = suggestionsContainer.querySelector('p.text-sm.mt-1');
            if (actionText && analysis.recommended_actions.length > 0) {
                actionText.textContent = analysis.recommended_actions.join('. ') + '.';
            }
        }
    }

    showGeminiFeedback(analysis) {
        const feedback = `AI Analysis: ${analysis.emergency_level} risk level. ${analysis.recommended_actions[0]}`;
        this.showNotification(feedback, this.getRiskColor(analysis.emergency_level));
    }

    getAlertType(risk) {
        const riskLower = risk.toLowerCase();
        if (riskLower.includes('suicide') || riskLower.includes('kill') || riskLower.includes('die')) {
            return 'emergency';
        } else if (riskLower.includes('overdose') || riskLower.includes('pills') || riskLower.includes('drugs')) {
            return 'warning';
        } else {
            return 'info';
        }
    }

    // Enhanced AI Analysis with Gemini
    async triggerAIAnalysis(entry) {
        // Simulate AI processing delay
        setTimeout(async () => {
            this.updateAIAnalysis(entry);
            this.checkForAlerts(entry);
            
            // Get Gemini analysis for this specific entry
            const geminiAnalysis = await this.analyzeEmergencyWithGemini(entry.text);
            if (geminiAnalysis) {
                this.updateDashboardWithGeminiAnalysis(geminiAnalysis);
            }
        }, 1000);
    }

    updateCurrentTime() {
        const timeElement = document.getElementById('current-time');
        const updateTime = () => {
            const now = new Date();
            timeElement.textContent = now.toLocaleTimeString();
        };
        updateTime();
        setInterval(updateTime, 1000);
    }

    simulateRealTimeTranscript() {
        const transcriptData = [
            { time: '00:20', speaker: 'Caller', text: 'I just feel like there\'s no point anymore. Everything I try fails.' },
            { time: '00:25', speaker: 'Operator', text: 'I hear how much pain you\'re in. Can you tell me what happened today that made you feel this way?' },
            { time: '00:32', speaker: 'Caller', text: 'I lost my job last week. My girlfriend left me. I have nothing left.' },
            { time: '00:38', speaker: 'Operator', text: 'That sounds incredibly difficult. Losing your job and relationship at the same time would be overwhelming for anyone.' },
            { time: '00:45', speaker: 'Caller', text: 'I have a bottle of pills here. I\'m thinking about taking them all.' },
            { time: '00:50', speaker: 'Operator', text: 'I\'m very concerned about you right now. Can you put the pills away from you? I want to help you get through this.' },
            { time: '00:58', speaker: 'Caller', text: 'I don\'t know if I can. I\'m so tired of feeling this way.' },
            { time: '01:05', speaker: 'Operator', text: 'I understand you\'re exhausted. But you\'re reaching out for help, and that shows strength. Let\'s work together to get you the support you need.' }
        ];

        let index = 0;
        const addTranscriptEntry = () => {
            if (index < transcriptData.length && this.isCallActive) {
                const entry = transcriptData[index];
                this.addTranscriptLine(entry.time, entry.speaker, entry.text);
                index++;
                
                // Trigger AI analysis after each new entry
                this.triggerAIAnalysis(entry);
                
                setTimeout(addTranscriptEntry, Math.random() * 5000 + 3000); // Random delay between 3-8 seconds
            }
        };
        
        setTimeout(addTranscriptEntry, 2000);
    }

    updateAIAnalysis(entry) {
        // Update AI analysis based on new transcript entry
        const analysisElements = {
            'Location': 'Home - Alone',
            'Situation': 'Suicidal Ideation',
            'Tone': this.analyzeTone(entry.text),
            'Risk Level': this.calculateRiskLevel()
        };

        Object.entries(analysisElements).forEach(([key, value]) => {
            const element = document.querySelector(`[data-analysis="${key}"]`);
            if (element) {
                element.textContent = value;
            }
        });
    }

    analyzeTone(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('kill') || lowerText.includes('die') || lowerText.includes('end it')) {
            return 'Suicidal/Desperate';
        } else if (lowerText.includes('tired') || lowerText.includes('hopeless') || lowerText.includes('no point')) {
            return 'Hopeless/Desperate';
        } else if (lowerText.includes('angry') || lowerText.includes('furious')) {
            return 'Angry/Agitated';
        } else if (lowerText.includes('scared') || lowerText.includes('afraid')) {
            return 'Scared/Anxious';
        }
        return 'Calm/Neutral';
    }

    calculateRiskLevel() {
        const suicidalKeywords = ['kill', 'die', 'end it', 'pills', 'suicide'];
        const text = this.transcript.map(t => t.text).join(' ').toLowerCase();
        const riskCount = suicidalKeywords.filter(keyword => text.includes(keyword)).length;
        
        if (riskCount >= 3) return 'CRITICAL';
        if (riskCount >= 2) return 'HIGH';
        if (riskCount >= 1) return 'MEDIUM';
        return 'LOW';
    }

    checkForAlerts(entry) {
        const text = entry.text.toLowerCase();
        const alerts = [];

        // Check for suicidal thoughts
        if (text.includes('kill') || text.includes('die') || text.includes('end it')) {
            alerts.push({
                type: 'emergency',
                title: 'SUICIDAL THOUGHTS DETECTED',
                message: 'Keywords: "ending it all", "pills", "tired of fighting"',
                icon: 'fas fa-skull-crossbones'
            });
        }

        // Check for overdose risk
        if (text.includes('pills') || text.includes('medication')) {
            alerts.push({
                type: 'warning',
                title: 'OVERDOSE RISK',
                message: 'Mentioned having pills available',
                icon: 'fas fa-pills'
            });
        }

        // Check for alone status
        if (text.includes('alone') || text.includes('no one')) {
            alerts.push({
                type: 'info',
                title: 'ALONE AT HOME',
                message: 'No other persons detected in background',
                icon: 'fas fa-home'
            });
        }

        // Add new alerts
        alerts.forEach(alert => {
            this.addAlert(alert);
        });
    }

    addAlert(alert) {
        const alertsContainer = document.querySelector('.space-y-3');
        const alertElement = document.createElement('div');
        alertElement.className = `bg-${alert.type} bg-opacity-20 border border-${alert.type} p-3 rounded slide-in`;
        
        alertElement.innerHTML = `
            <div class="flex items-center">
                <i class="${alert.icon} text-${alert.type} mr-2"></i>
                <span class="font-semibold text-${alert.type}">${alert.title}</span>
            </div>
            <p class="text-sm mt-1">${alert.message}</p>
        `;
        
        alertsContainer.appendChild(alertElement);
        
        // Remove alert after 10 seconds
        setTimeout(() => {
            alertElement.remove();
        }, 10000);
    }

    setupEventListeners() {
        // Call control buttons
        const escalateBtn = findButtonByText('Escalate');
        const transferBtn = findButtonByText('Transfer');
        const endCallBtn = findButtonByText('End Call');

        if (escalateBtn) {
            escalateBtn.addEventListener('click', () => {
                handleOperatorAction({
                    type: 'escalate_call',
                    callId: 'current_call'
                });
            });
        }
        
        if (transferBtn) {
            transferBtn.addEventListener('click', () => {
                handleOperatorAction({
                    type: 'transfer_call',
                    callId: 'current_call',
                    department: 'crisis_hotline'
                });
            });
        }
        
        if (endCallBtn) {
            endCallBtn.addEventListener('click', () => {
                handleOperatorAction({
                    type: 'end_call',
                    callId: 'current_call'
                });
            });
        }

        // Emergency dispatch buttons
        const dispatchEMSBtn = findButtonByText('Dispatch EMS');
        const dispatchPoliceBtn = findButtonByText('Dispatch Police');
        const transferCallBtn = findButtonByText('Transfer Call');
        const addNotesBtn = findButtonByText('Add Notes');

        if (dispatchEMSBtn) {
            dispatchEMSBtn.addEventListener('click', () => {
                handleOperatorAction({
                    type: 'dispatch_ems',
                    location: '123 Main St, Apt 4B, New York, NY 10001'
                });
            });
        }
        
        if (dispatchPoliceBtn) {
            dispatchPoliceBtn.addEventListener('click', () => {
                handleOperatorAction({
                    type: 'dispatch_police',
                    location: '123 Main St, Apt 4B, New York, NY 10001'
                });
            });
        }
        
        if (transferCallBtn) {
            transferCallBtn.addEventListener('click', () => {
                handleOperatorAction({
                    type: 'transfer_call',
                    callId: 'current_call',
                    department: 'crisis_hotline'
                });
            });
        }
        
        if (addNotesBtn) {
            addNotesBtn.addEventListener('click', () => {
                showNotesModal();
            });
        }

        // AI suggestion buttons
        document.querySelectorAll('.bg-gray-800 button').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.textContent;
                handleAISuggestion(action);
            });
        });

        // Add Gemini Analysis button
        this.addGeminiAnalysisButton();
    }

    addGeminiAnalysisButton() {
        const header = document.querySelector('header');
        if (header) {
            const geminiBtn = document.createElement('button');
            geminiBtn.className = 'ml-4 px-3 py-1 bg-info text-white rounded text-sm hover:bg-blue-600 transition-colors';
            geminiBtn.innerHTML = '<i class="fas fa-robot mr-1"></i>Gemini Analysis';
            geminiBtn.addEventListener('click', () => this.triggerManualGeminiAnalysis());
            
            const headerContent = header.querySelector('.flex.items-center.space-x-4');
            if (headerContent) {
                headerContent.appendChild(geminiBtn);
            }
        }
    }

    async triggerManualGeminiAnalysis() {
        if (this.transcript.length === 0) {
            this.showNotification('No transcript available for analysis', 'warning');
            return;
        }

        this.showNotification('Running Gemini AI analysis...', 'info');
        
        const transcriptText = this.transcript.map(t => `${t.speaker}: ${t.text}`).join(' ');
        const analysis = await this.analyzeEmergencyWithGemini(transcriptText);
        
        if (analysis) {
            this.updateDashboardWithGeminiAnalysis(analysis);
            this.showGeminiAnalysisModal(analysis);
        } else {
            this.showNotification('Gemini analysis failed', 'warning');
        }
    }

    showGeminiAnalysisModal(analysis) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-dark p-6 rounded-lg max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
                <h3 class="text-xl font-bold mb-4 flex items-center">
                    <i class="fas fa-robot text-info mr-2"></i>Gemini AI Analysis
                </h3>
                <div class="space-y-4">
                    <div class="bg-gray-800 p-3 rounded">
                        <h4 class="font-semibold text-${this.getRiskColor(analysis.emergency_level)}">Emergency Level: ${analysis.emergency_level}</h4>
                    </div>
                    <div class="bg-gray-800 p-3 rounded">
                        <h4 class="font-semibold">Immediate Risks:</h4>
                        <ul class="mt-2 space-y-1">
                            ${analysis.immediate_risks.map(risk => `<li class="text-sm">• ${risk}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="bg-gray-800 p-3 rounded">
                        <h4 class="font-semibold">Emotional State:</h4>
                        <p class="text-sm mt-1">${analysis.emotional_state}</p>
                    </div>
                    <div class="bg-gray-800 p-3 rounded">
                        <h4 class="font-semibold">Recommended Actions:</h4>
                        <ul class="mt-2 space-y-1">
                            ${analysis.recommended_actions.map(action => `<li class="text-sm">• ${action}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="bg-gray-800 p-3 rounded">
                        <h4 class="font-semibold">Keywords Detected:</h4>
                        <p class="text-sm mt-1">${analysis.keywords_detected.join(', ')}</p>
                    </div>
                </div>
                <button class="mt-4 px-4 py-2 bg-info text-white rounded hover:bg-blue-600">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('button').addEventListener('click', () => {
            modal.remove();
        });
    }

    escalateCall() {
        this.showNotification('Call escalated to supervisor', 'warning');
        this.addTranscriptLine('01:15', 'System', 'Call escalated to supervisor');
    }

    transferCall() {
        this.showNotification('Transferring to crisis hotline...', 'info');
        this.addTranscriptLine('01:20', 'System', 'Transferring to crisis hotline');
    }

    endCall() {
        if (confirm('Are you sure you want to end this call?')) {
            this.isCallActive = false;
            this.showNotification('Call ended', 'success');
            this.addTranscriptLine('01:25', 'System', 'Call ended by operator');
        }
    }

    handleAISuggestion(suggestion) {
        switch(suggestion) {
            case 'Dispatch Emergency Services':
                this.showNotification('Dispatching emergency services...', 'emergency');
                this.addTranscriptLine('01:30', 'System', 'Emergency services dispatched');
                break;
            case 'Transfer to Crisis Line':
                this.transferCall();
                break;
            case 'View Techniques':
                this.showDeescalationTechniques();
                break;
        }
    }

    handleOperatorAction(action) {
        switch(action) {
            case 'Dispatch EMS':
                this.showNotification('EMS dispatched to location', 'emergency');
                break;
            case 'Dispatch Police':
                this.showNotification('Police dispatched to location', 'warning');
                break;
            case 'Transfer Call':
                this.transferCall();
                break;
            case 'Add Notes':
                this.showNotesModal();
                break;
        }
    }

    showDeescalationTechniques() {
        const techniques = [
            'Active listening - "I hear you"',
            'Validate feelings - "That sounds really difficult"',
            'Focus on immediate safety - "Can you put the pills away?"',
            'Offer hope - "This feeling won\'t last forever"',
            'Connect to resources - "Let\'s get you some help"'
        ];

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-dark p-6 rounded-lg max-w-md w-full mx-4">
                <h3 class="text-xl font-bold mb-4">De-escalation Techniques</h3>
                <ul class="space-y-2">
                    ${techniques.map(tech => `<li class="text-sm">• ${tech}</li>`).join('')}
                </ul>
                <button class="mt-4 px-4 py-2 bg-info text-white rounded hover:bg-blue-600">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.querySelector('button').addEventListener('click', () => {
            modal.remove();
        });
    }

    showNotesModal() {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-dark p-6 rounded-lg max-w-md w-full mx-4">
                <h3 class="text-xl font-bold mb-4">Add Notes</h3>
                <textarea class="w-full h-32 bg-gray-800 border border-gray-700 rounded p-2 text-white" placeholder="Enter your notes here..."></textarea>
                <div class="flex space-x-2 mt-4">
                    <button class="px-4 py-2 bg-info text-white rounded hover:bg-blue-600">Save</button>
                    <button class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const [saveBtn, cancelBtn] = modal.querySelectorAll('button');
        saveBtn.addEventListener('click', () => {
            const notes = modal.querySelector('textarea').value;
            if (notes.trim()) {
                this.addTranscriptLine('01:35', 'Operator Notes', notes);
                this.showNotification('Notes saved', 'success');
            }
            modal.remove();
        });
        
        cancelBtn.addEventListener('click', () => {
            modal.remove();
        });
    }

    loadDummyData() {
        // Load past incidents data
        const pastIncidents = [
            {
                type: 'Suicide Attempt',
                date: 'March 15, 2024 - 2:30 AM',
                severity: 'HIGH RISK',
                description: 'Called expressing intent to harm self. Police and EMS dispatched.',
                color: 'emergency'
            },
            {
                type: 'Depression Crisis',
                date: 'February 28, 2024 - 11:15 PM',
                severity: 'MEDIUM',
                description: 'Feeling overwhelmed, referred to mental health hotline.',
                color: 'warning'
            },
            {
                type: 'Anxiety Attack',
                date: 'January 10, 2024 - 9:45 PM',
                severity: 'LOW',
                description: 'Panic attack, breathing exercises provided.',
                color: 'info'
            }
        ];

        // Populate past incidents
        const incidentsContainer = document.querySelector('.max-h-64');
        if (incidentsContainer) {
            incidentsContainer.innerHTML = pastIncidents.map(incident => `
                <div class="bg-gray-800 p-3 rounded border-l-4 border-${incident.color}">
                    <div class="flex justify-between items-start">
                        <div>
                            <p class="font-semibold text-sm">${incident.type}</p>
                            <p class="text-xs text-gray-400">${incident.date}</p>
                        </div>
                        <span class="bg-${incident.color} text-xs px-2 py-1 rounded">${incident.severity}</span>
                    </div>
                    <p class="text-sm mt-2">${incident.description}</p>
                </div>
            `).join('');
        }
    }

    simulateAIAnalysis() {
        // Simulate real-time AI analysis updates
        setInterval(() => {
            if (!this.isCallActive) return;
            
            // Update sentiment analysis
            const sentiments = ['Calm', 'Anxious', 'Angry', 'Hopeless', 'Desperate'];
            const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
            
            // Update risk assessment
            const riskLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
            const randomRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
            
            // Update AI analysis display
            const analysisContainer = document.querySelector('.grid.grid-cols-2');
            if (analysisContainer) {
                const toneElement = analysisContainer.querySelector('p.font-semibold.text-warning');
                const riskElement = analysisContainer.querySelector('p.font-semibold.text-emergency');
                
                if (toneElement) toneElement.textContent = randomSentiment;
                if (riskElement) riskElement.textContent = randomRisk;
            }
        }, 15000); // Update every 15 seconds
    }

    // Test function for Gemini API (can be called from browser console)
    async testGeminiAPI() {
        console.log('🧪 Testing Gemini API...');
        
        const testPrompt = `You are an AI assistant for emergency response operators. Analyze this emergency call transcript and provide:

1. EMERGENCY LEVEL: (LOW/MEDIUM/HIGH/CRITICAL)
2. IMMEDIATE RISKS: List any immediate dangers
3. EMOTIONAL STATE: Assess caller's emotional condition
4. RECOMMENDED ACTIONS: Specific steps for the operator
5. KEYWORDS DETECTED: Important phrases or words
6. BACKGROUND NOISE: Any concerning sounds or environment clues

Transcript: "Caller: I'm feeling really hopeless right now. I have some pills here and I'm thinking about ending it all. I just can't take it anymore."

Respond in JSON format:
{
    "emergency_level": "CRITICAL",
    "immediate_risks": ["suicidal ideation", "access to pills"],
    "emotional_state": "hopeless and desperate",
    "recommended_actions": ["dispatch EMS immediately", "keep caller engaged"],
    "keywords_detected": ["ending it all", "pills", "hopeless"],
    "background_noise": "sounds like caller is alone at home"
}`;

        try {
            const result = await this.callGeminiAPI(testPrompt);
            console.log('✅ Gemini API Response:', result);
            
            if (result) {
                const jsonMatch = result.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                    console.log('✅ Parsed JSON:', parsed);
                    this.showNotification('Gemini API test successful!', 'success');
                } else {
                    console.log('⚠️ No JSON found in response');
                    this.showNotification('Gemini API responded but no JSON found', 'warning');
                }
            } else {
                console.log('❌ No response from Gemini API');
                this.showNotification('Gemini API test failed', 'error');
            }
        } catch (error) {
            console.error('❌ Gemini API Test Error:', error);
            this.showNotification('Gemini API test error: ' + error.message, 'error');
        }
    }
}

// Initialize dashboard when DOM is loaded
let dashboard; // Global dashboard instance

document.addEventListener('DOMContentLoaded', () => {
    dashboard = new EmergencyDashboard();
    
    // Make test function globally accessible
    window.testGeminiAPI = () => dashboard.testGeminiAPI();
});

// Utility function for button selection
Element.prototype.querySelector = function(selector) {
    if (selector.includes(':contains(')) {
        const text = selector.match(/:contains\("([^"]+)"\)/)[1];
        const elements = this.querySelectorAll('button');
        for (let element of elements) {
            if (element.textContent.includes(text)) {
                return element;
            }
        }
        return null;
    }
    return this.querySelector(selector);
};

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your actual Google Client ID

// Session Management
let currentUser = null;
let isAuthenticated = false;

// WebSocket Connection
let socket = null;
let isConnected = false;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardElement = document.getElementById('dashboard');
const operatorName = document.getElementById('operator-name');
const logoutBtn = document.getElementById('logout-btn');
const demoLoginBtn = document.getElementById('demo-login');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeLoginSystem();
    checkAuthenticationStatus();
    initializeWebSocket();
});

// Login System Functions
function initializeLoginSystem() {
    // Demo login button
    if (demoLoginBtn) {
        demoLoginBtn.addEventListener('click', handleDemoLogin);
    }
    
    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

function checkAuthenticationStatus() {
    const savedUser = localStorage.getItem('emergency_response_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        isAuthenticated = true;
        showDashboard();
    } else {
        showLoginScreen();
    }
}

function handleDemoLogin() {
    // Simulate Google login for testing
    currentUser = {
        name: 'Demo Operator',
        email: 'demo@emergency.gov',
        picture: null,
        isDemo: true
    };
    
    localStorage.setItem('emergency_response_user', JSON.stringify(currentUser));
    isAuthenticated = true;
    showDashboard();
}

function handleLogout() {
    currentUser = null;
    isAuthenticated = false;
    localStorage.removeItem('emergency_response_user');
    showLoginScreen();
}

function showLoginScreen() {
    loginScreen.classList.remove('hidden');
    dashboardElement.classList.add('hidden');
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboardElement.classList.remove('hidden');
    
    if (currentUser) {
        operatorName.textContent = currentUser.name;
    }
    
    // Initialize dashboard functionality
    initializeDashboard();
    
    // Add simulation controls
    addSimulationControls();
    
    // Update operator action buttons
    updateOperatorActionButtons();
}

// Google OAuth Callback (for real Google login)
function handleCredentialResponse(response) {
    // Decode the JWT token
    const responsePayload = decodeJwtResponse(response.credential);
    
    currentUser = {
        name: responsePayload.name,
        email: responsePayload.email,
        picture: responsePayload.picture,
        isDemo: false
    };
    
    localStorage.setItem('emergency_response_user', JSON.stringify(currentUser));
    isAuthenticated = true;
    showDashboard();
}

function decodeJwtResponse(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// Dashboard Initialization
function initializeDashboard() {
    if (!isAuthenticated) return;
    
    // Initialize existing dashboard functionality
    initializeRealTimeUpdates();
    initializeGeminiAI();
    initializeSentimentAnalysis();
    initializeTestFunctions();
}

// Real-time Updates
function initializeRealTimeUpdates() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);
    
    updateCallDuration();
    setInterval(updateCallDuration, 1000);
}

function updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const timeElement = document.getElementById('current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

function updateCallDuration() {
    const durationElement = document.getElementById('call-duration');
    if (!durationElement) return;
    
    // Simulate call duration
    const startTime = new Date('2024-01-15T10:00:00');
    const now = new Date();
    const diff = now - startTime;
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    durationElement.textContent = 
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Gemini AI Integration
let geminiAnalysisInterval;
let geminiStatus = 'idle';

function initializeGeminiAI() {
    const geminiStatusElement = document.getElementById('gemini-status');
    if (geminiStatusElement) {
        geminiStatusElement.className = 'w-3 h-3 bg-gray-500 rounded-full mr-2';
    }
    
    // Start background analysis
    startGeminiAnalysis();
}

function startGeminiAnalysis() {
    // Run initial analysis
    performGeminiAnalysis();
    
    // Set up interval for continuous analysis
    geminiAnalysisInterval = setInterval(performGeminiAnalysis, 30000); // Every 30 seconds
}

function performGeminiAnalysis() {
    updateGeminiStatus('analyzing');
    
    // Simulate API call delay
    setTimeout(() => {
        const mockAnalysis = {
            riskLevel: 'CRITICAL',
            sentiment: 'HOPELESS',
            keywords: ['suicide', 'pills', 'ending it all', 'hopeless'],
            suggestions: [
                'Dispatch emergency services immediately',
                'Use de-escalation techniques',
                'Transfer to crisis hotline'
            ],
            confidence: 0.95
        };
        
        updateDashboardWithGeminiAnalysis(mockAnalysis);
        updateGeminiStatus('active');
    }, 2000);
}

function updateGeminiStatus(status) {
    geminiStatus = status;
    const geminiStatusElement = document.getElementById('gemini-status');
    
    if (geminiStatusElement) {
        switch (status) {
            case 'analyzing':
                geminiStatusElement.className = 'w-3 h-3 bg-warning rounded-full animate-pulse mr-2';
                break;
            case 'active':
                geminiStatusElement.className = 'w-3 h-3 bg-success rounded-full mr-2';
                break;
            case 'error':
                geminiStatusElement.className = 'w-3 h-3 bg-emergency rounded-full mr-2';
                break;
            default:
                geminiStatusElement.className = 'w-3 h-3 bg-gray-500 rounded-full mr-2';
        }
    }
}

function updateDashboardWithGeminiAnalysis(analysis) {
    // Update risk level
    const riskElements = document.querySelectorAll('[id*="risk"]');
    riskElements.forEach(element => {
        if (element.textContent.includes('CRITICAL')) {
            element.className = 'font-semibold text-emergency';
        }
    });
    
    // Add new alert if needed
    const alertsContainer = document.querySelector('.space-y-3');
    if (alertsContainer && analysis.riskLevel === 'CRITICAL') {
        const newAlert = document.createElement('div');
        newAlert.className = 'bg-emergency bg-opacity-20 border border-emergency p-3 rounded animate-pulse';
        newAlert.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-robot text-emergency mr-2"></i>
                <span class="font-semibold text-emergency">AI DETECTED CRITICAL RISK</span>
            </div>
            <p class="text-sm mt-1">Confidence: ${(analysis.confidence * 100).toFixed(1)}%</p>
        `;
        alertsContainer.appendChild(newAlert);
    }
}

// Sentiment Analysis
function initializeSentimentAnalysis() {
    // Real-time sentiment analysis of transcript
    const transcriptContainer = document.getElementById('transcript-container');
    if (transcriptContainer) {
        // Monitor for new transcript entries
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'childList') {
                    analyzeTranscriptSentiment();
                }
            });
        });
        
        observer.observe(transcriptContainer, { childList: true, subtree: true });
    }
}

function analyzeTranscriptSentiment() {
    const transcriptText = document.getElementById('transcript-container').textContent;
    
    // Simple keyword-based sentiment analysis
    const negativeKeywords = ['suicide', 'kill', 'die', 'end', 'hopeless', 'worthless', 'pain'];
    const positiveKeywords = ['help', 'hope', 'better', 'safe', 'support'];
    
    let negativeCount = 0;
    let positiveCount = 0;
    
    negativeKeywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = transcriptText.match(regex);
        if (matches) negativeCount += matches.length;
    });
    
    positiveKeywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = transcriptText.match(regex);
        if (matches) positiveCount += matches.length;
    });
    
    // Update sentiment display
    const sentimentElement = document.querySelector('[id*="tone"]');
    if (sentimentElement) {
        if (negativeCount > positiveCount) {
            sentimentElement.textContent = 'HOPELESS/DESPERATE';
            sentimentElement.className = 'font-semibold text-emergency';
        } else if (positiveCount > negativeCount) {
            sentimentElement.textContent = 'HOPEFUL/COOPERATIVE';
            sentimentElement.className = 'font-semibold text-success';
        } else {
            sentimentElement.textContent = 'NEUTRAL/UNCERTAIN';
            sentimentElement.className = 'font-semibold text-warning';
        }
    }
}

// Test Functions
function initializeTestFunctions() {
    // Add test function to window for console access
    window.testGeminiAPI = function() {
        console.log('Testing Gemini AI Integration...');
        performGeminiAnalysis();
    };
    
    // Add manual trigger button functionality
    const manualTriggerBtn = document.createElement('button');
    manualTriggerBtn.textContent = 'Manual AI Analysis';
    manualTriggerBtn.className = 'px-3 py-1 bg-info text-white rounded text-sm hover:bg-blue-600 transition-colors ml-2';
    manualTriggerBtn.onclick = performGeminiAnalysis;
    
    const headerActions = document.querySelector('.flex.items-center.space-x-4');
    if (headerActions) {
        headerActions.appendChild(manualTriggerBtn);
    }
}

// Export functions for testing
window.handleDemoLogin = handleDemoLogin;
window.handleLogout = handleLogout;
window.simulateEmergencyCall = simulateEmergencyCall;
window.showNotification = showNotification;

// Console test function
console.log('Emergency Response AI Dashboard loaded!');
console.log('Test functions available:');
console.log('- testGeminiAPI(): Test the Gemini AI integration');
console.log('- handleDemoLogin(): Simulate operator login');
console.log('- handleLogout(): Logout current operator');
console.log('- simulateEmergencyCall(scenario): Test call simulation');
console.log('- showNotification(message, type): Test notifications');

// WebSocket Initialization
function initializeWebSocket() {
    try {
        // Connect to backend server
        socket = io('http://localhost:3000');
        
        socket.on('connect', () => {
            console.log('🔌 Connected to backend server');
            isConnected = true;
            updateConnectionStatus('connected');
        });
        
        socket.on('disconnect', () => {
            console.log('🔌 Disconnected from backend server');
            isConnected = false;
            updateConnectionStatus('disconnected');
        });
        
        // Handle new emergency calls
        socket.on('new-call', (callData) => {
            console.log('📞 New emergency call received:', callData);
            handleNewCall(callData);
        });
        
        // Handle call status updates
        socket.on('call-status-update', (update) => {
            console.log('📊 Call status update:', update);
            updateCallStatus(update);
        });
        
        // Handle transcript updates
        socket.on('transcript-updated', (transcriptEntry) => {
            console.log('📝 Transcript update:', transcriptEntry);
            addTranscriptLine(transcriptEntry.timestamp, transcriptEntry.speaker, transcriptEntry.text);
        });
        
        // Handle AI analysis
        socket.on('call-analysis', (analysis) => {
            console.log('🤖 AI analysis received:', analysis);
            updateAIAnalysis(analysis);
        });
        
        // Handle emergency services status
        socket.on('emergency-services-status', (status) => {
            console.log('🚨 Emergency services status:', status);
            updateEmergencyServicesStatus(status);
        });
        
        // Handle service dispatch confirmations
        socket.on('service-dispatched', (dispatch) => {
            console.log('🚨 Service dispatched:', dispatch);
            showServiceDispatchNotification(dispatch);
        });
        
        // Handle service responses
        socket.on('service-response', (response) => {
            console.log('✅ Service response:', response);
            showServiceResponseNotification(response);
        });
        
        // Handle call escalations
        socket.on('call-escalated', (data) => {
            console.log('🚨 Call escalated:', data);
            showNotification('Call escalated to supervisor', 'warning');
        });
        
        // Handle call transfers
        socket.on('call-transferred', (data) => {
            console.log('🔄 Call transferred:', data);
            showNotification(`Call transferred to ${data.department}`, 'info');
        });
        
        // Handle call endings
        socket.on('call-ended', (data) => {
            console.log('📞 Call ended:', data);
            showNotification('Call ended', 'success');
        });
        
    } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        updateConnectionStatus('error');
    }
}

function updateConnectionStatus(status) {
    const statusElement = document.querySelector('.flex.items-center .w-3.h-3.bg-emergency');
    if (statusElement) {
        switch (status) {
            case 'connected':
                statusElement.className = 'w-3 h-3 bg-success rounded-full animate-pulse mr-2';
                break;
            case 'disconnected':
                statusElement.className = 'w-3 h-3 bg-warning rounded-full mr-2';
                break;
            case 'error':
                statusElement.className = 'w-3 h-3 bg-emergency rounded-full mr-2';
                break;
            default:
                statusElement.className = 'w-3 h-3 bg-gray-500 rounded-full mr-2';
        }
    }
}

function handleNewCall(callData) {
    // Update caller information
    const callerPhone = document.getElementById('caller-phone');
    const callerPhoneDisplay = document.getElementById('caller-phone-display');
    
    if (callerPhone) callerPhone.textContent = callData.from;
    if (callerPhoneDisplay) callerPhoneDisplay.textContent = callData.from;
    
    // Update call status
    const callStatusElement = document.querySelector('.text-lg.font-semibold.text-emergency');
    if (callStatusElement) {
        callStatusElement.textContent = 'ACTIVE CALL';
    }
    
    // Show notification
    showNotification('New emergency call received', 'emergency');
    
    // Start call timer
    startCallTimer();
    
    // Clear previous transcript
    const transcriptContainer = document.getElementById('transcript-container');
    if (transcriptContainer) {
        transcriptContainer.innerHTML = '';
    }
}

function updateCallStatus(update) {
    if (update.status === 'completed') {
        const callStatusElement = document.querySelector('.text-lg.font-semibold.text-emergency');
        if (callStatusElement) {
            callStatusElement.textContent = 'CALL ENDED';
            callStatusElement.className = 'text-lg font-semibold text-gray-400';
        }
        
        showNotification('Call ended', 'success');
    }
}

function updateAIAnalysis(analysis) {
    // Update AI Analysis panel
    const analysisContainer = document.querySelector('.grid.grid-cols-2');
    if (analysisContainer) {
        // Update Risk Level
        const riskElement = analysisContainer.querySelector('p.font-semibold.text-emergency');
        if (riskElement) {
            riskElement.textContent = analysis.analysis.emergencyLevel;
            riskElement.className = `font-semibold text-${this.getRiskColor(analysis.analysis.emergencyLevel)}`;
        }

        // Update Tone/Emotional State
        const toneElement = analysisContainer.querySelector('p.font-semibold.text-warning');
        if (toneElement) {
            toneElement.textContent = analysis.analysis.sentiment;
        }

        // Update Situation
        const situationElement = analysisContainer.querySelector('p.font-semibold.text-emergency');
        if (situationElement && analysis.analysis.keywords.length > 0) {
            situationElement.textContent = analysis.analysis.keywords[0].toUpperCase().replace('_', ' ');
        }
    }
    
    // Update alerts based on analysis
    this.updateAlertsFromAnalysis(analysis.analysis);
    
    // Update AI suggestions
    this.updateSuggestionsFromAnalysis(analysis.analysis);
}

function updateAlertsFromAnalysis(analysis) {
    const alertsContainer = document.querySelector('.space-y-3');
    if (!alertsContainer) return;
    
    // Clear existing alerts
    const existingAlerts = alertsContainer.querySelectorAll('.bg-emergency, .bg-warning, .bg-info');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add new alerts based on analysis
    analysis.riskFactors.forEach(risk => {
        const alertElement = document.createElement('div');
        alertElement.className = 'bg-emergency bg-opacity-20 border border-emergency p-3 rounded animate-pulse';
        
        alertElement.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-robot text-emergency mr-2"></i>
                <span class="font-semibold text-emergency">AI DETECTED: ${risk.toUpperCase()}</span>
            </div>
            <p class="text-sm mt-1">Confidence: ${(analysis.confidence * 100).toFixed(1)}%</p>
        `;
        
        alertsContainer.appendChild(alertElement);
    });
}

function updateSuggestionsFromAnalysis(analysis) {
    const suggestionsContainer = document.querySelector('.bg-gray-800.p-3.rounded.border-l-4.border-emergency');
    if (suggestionsContainer) {
        const actionText = suggestionsContainer.querySelector('p.text-sm.mt-1');
        if (actionText && analysis.recommendedActions.length > 0) {
            actionText.textContent = analysis.recommendedActions.join('. ') + '.';
        }
    }
}

function updateEmergencyServicesStatus(status) {
    // Update emergency services availability
    console.log('Emergency services status updated:', status);
}

function showServiceDispatchNotification(dispatch) {
    showNotification(`${dispatch.service.toUpperCase()} dispatched to ${dispatch.location}`, 'info');
}

function showServiceResponseNotification(response) {
    showNotification(`${response.service.toUpperCase()} arrived at ${response.location}`, 'success');
}

// Add simulation buttons to dashboard
function addSimulationControls() {
    console.log('🎮 Adding simulation controls...');
    
    const headerActions = document.querySelector('.flex.items-center.space-x-4');
    if (headerActions) {
        // Check if simulation controls already exist
        if (document.getElementById('simulate-call-btn')) {
            console.log('🎮 Simulation controls already exist');
            return;
        }
        
        // Add simulation dropdown
        const simulationDiv = document.createElement('div');
        simulationDiv.className = 'flex items-center space-x-2';
        simulationDiv.innerHTML = `
            <select id="scenario-select" class="px-2 py-1 bg-gray-700 text-white text-sm rounded border border-gray-600">
                <option value="suicide">Suicide Crisis</option>
                <option value="accident">Traffic Accident</option>
                <option value="medical">Medical Emergency</option>
            </select>
            <button id="simulate-call-btn" class="px-3 py-1 bg-emergency text-white text-sm rounded hover:bg-red-700 transition-colors">
                <i class="fas fa-phone mr-1"></i>Simulate Call
            </button>
        `;
        
        headerActions.appendChild(simulationDiv);
        
        // Add event listeners
        const simulateBtn = document.getElementById('simulate-call-btn');
        const scenarioSelect = document.getElementById('scenario-select');
        
        if (simulateBtn) {
            simulateBtn.addEventListener('click', () => {
                const scenario = scenarioSelect.value;
                console.log('📞 Simulating call with scenario:', scenario);
                simulateEmergencyCall(scenario);
            });
        }
        
        console.log('✅ Simulation controls added successfully');
    } else {
        console.error('❌ Could not find header actions container');
    }
}

// Simulate emergency call (enhanced version)
function simulateEmergencyCall(scenario = 'suicide') {
    console.log('📞 Starting emergency call simulation:', scenario);
    
    // Show notification that simulation is starting
    showNotification('Starting emergency call simulation...', 'info');
    
    // Update caller information immediately
    const callerPhone = document.getElementById('caller-phone');
    const callerPhoneDisplay = document.getElementById('caller-phone-display');
    const randomPhone = '+1555' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    
    if (callerPhone) callerPhone.textContent = randomPhone;
    if (callerPhoneDisplay) callerPhoneDisplay.textContent = randomPhone;
    
    // Update call status
    const callStatusElement = document.querySelector('.text-lg.font-semibold.text-emergency');
    if (callStatusElement) {
        callStatusElement.textContent = 'ACTIVE CALL';
    }
    
    // Clear previous transcript
    const transcriptContainer = document.getElementById('transcript-container');
    if (transcriptContainer) {
        transcriptContainer.innerHTML = '';
    }
    
    // Start call timer
    startCallTimer();
    
    // Simulate transcript updates
    simulateTranscriptUpdates(scenario);
    
    // Try to connect to backend if available
    if (isConnected && socket) {
        const callData = {
            phoneNumber: randomPhone,
            scenario: scenario
        };
        
        console.log('📡 Sending simulation data to backend:', callData);
        socket.emit('simulate-call', callData);
    } else {
        console.log('⚠️ Backend not connected, running local simulation');
    }
}

// Simulate transcript updates (enhanced version)
function simulateTranscriptUpdates(scenario) {
    console.log('📝 Starting transcript simulation for scenario:', scenario);
    
    const scenarios = {
        'suicide': [
            "I don't know if I can do this anymore...",
            "I have pills here and I'm thinking about ending it all.",
            "Everything feels so hopeless right now.",
            "I just want the pain to stop.",
            "I've been feeling this way for weeks.",
            "I don't see any point in continuing."
        ],
        'accident': [
            "There's been a terrible accident on the highway.",
            "Multiple cars are involved and there's debris everywhere.",
            "I can see people trapped in their vehicles.",
            "We need emergency services immediately!",
            "The traffic is completely blocked.",
            "I think there are injuries."
        ],
        'medical': [
            "My husband is having severe chest pain.",
            "He's having trouble breathing and looks pale.",
            "I think it might be a heart attack.",
            "Please send an ambulance quickly!",
            "He's sweating and clutching his chest.",
            "I'm really worried about him."
        ]
    };
    
    const transcript = scenarios[scenario] || scenarios['suicide'];
    let index = 0;
    
    // Add initial operator greeting
    setTimeout(() => {
        addTranscriptLine('00:01', 'Operator', '911, what\'s your emergency?');
    }, 1000);
    
    const interval = setInterval(() => {
        if (index < transcript.length) {
            const time = String(Math.floor((index + 2) * 3 / 60)).padStart(2, '0') + ':' + String((index + 2) * 3 % 60).padStart(2, '0');
            addTranscriptLine(time, 'Caller', transcript[index]);
            
            // Update AI analysis after each entry
            updateAIAnalysisFromTranscript(transcript[index], scenario);
            
            index++;
        } else {
            clearInterval(interval);
            console.log('✅ Transcript simulation completed');
        }
    }, 3000); // Add new transcript entry every 3 seconds
}

// Update AI analysis based on transcript
function updateAIAnalysisFromTranscript(text, scenario) {
    console.log('🤖 Updating AI analysis for:', text);
    
    // Update AI Analysis panel
    const analysisContainer = document.querySelector('.grid.grid-cols-2');
    if (analysisContainer) {
        // Update Risk Level based on scenario
        const riskElement = analysisContainer.querySelector('p.font-semibold.text-emergency');
        if (riskElement) {
            let riskLevel = 'MEDIUM';
            if (scenario === 'suicide') riskLevel = 'CRITICAL';
            else if (scenario === 'medical') riskLevel = 'HIGH';
            else if (scenario === 'accident') riskLevel = 'HIGH';
            
            riskElement.textContent = riskLevel;
            riskElement.className = `font-semibold text-${this.getRiskColor(riskLevel)}`;
        }

        // Update Tone/Emotional State
        const toneElement = analysisContainer.querySelector('p.font-semibold.text-warning');
        if (toneElement) {
            let tone = 'ANXIOUS';
            if (scenario === 'suicide') tone = 'HOPELESS/DESPERATE';
            else if (scenario === 'medical') tone = 'PANICKED';
            else if (scenario === 'accident') tone = 'URGENT';
            
            toneElement.textContent = tone;
        }

        // Update Situation
        const situationElement = analysisContainer.querySelector('p.font-semibold.text-emergency');
        if (situationElement) {
            let situation = 'EMERGENCY';
            if (scenario === 'suicide') situation = 'SUICIDAL IDEATION';
            else if (scenario === 'medical') situation = 'MEDICAL EMERGENCY';
            else if (scenario === 'accident') situation = 'TRAFFIC ACCIDENT';
            
            situationElement.textContent = situation;
        }
    }
    
    // Update alerts based on scenario
    this.updateAlertsFromScenario(scenario);
    
    // Update AI suggestions
    this.updateSuggestionsFromScenario(scenario);
}

// Update alerts based on scenario
function updateAlertsFromScenario(scenario) {
    const alertsContainer = document.querySelector('.space-y-3');
    if (!alertsContainer) return;
    
    // Clear existing alerts
    const existingAlerts = alertsContainer.querySelectorAll('.bg-emergency, .bg-warning, .bg-info');
    existingAlerts.forEach(alert => alert.remove());
    
    // Add scenario-specific alerts
    const alerts = [];
    
    if (scenario === 'suicide') {
        alerts.push({
            type: 'emergency',
            title: 'SUICIDAL THOUGHTS DETECTED',
            message: 'Caller expressing suicidal ideation and has access to pills'
        });
        alerts.push({
            type: 'warning',
            title: 'MENTAL HEALTH CRISIS',
            message: 'Immediate intervention required'
        });
    } else if (scenario === 'medical') {
        alerts.push({
            type: 'emergency',
            title: 'MEDICAL EMERGENCY',
            message: 'Possible heart attack symptoms detected'
        });
        alerts.push({
            type: 'warning',
            title: 'URGENT MEDICAL RESPONSE',
            message: 'EMS dispatch recommended immediately'
        });
    } else if (scenario === 'accident') {
        alerts.push({
            type: 'emergency',
            title: 'TRAFFIC ACCIDENT',
            message: 'Multiple vehicles involved with potential injuries'
        });
        alerts.push({
            type: 'warning',
            title: 'ROAD CLOSURE NEEDED',
            message: 'Traffic control and emergency response required'
        });
    }
    
    // Add alerts to container
    alerts.forEach(alert => {
        const alertElement = document.createElement('div');
        alertElement.className = `bg-${alert.type} bg-opacity-20 border border-${alert.type} p-3 rounded animate-pulse`;
        
        alertElement.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle text-${alert.type} mr-2"></i>
                <span class="font-semibold text-${alert.type}">${alert.title}</span>
            </div>
            <p class="text-sm mt-1">${alert.message}</p>
        `;
        
        alertsContainer.appendChild(alertElement);
    });
}

// Update suggestions based on scenario
function updateSuggestionsFromScenario(scenario) {
    const suggestionsContainer = document.querySelector('.bg-gray-800.p-3.rounded.border-l-4.border-emergency');
    if (suggestionsContainer) {
        const actionText = suggestionsContainer.querySelector('p.text-sm.mt-1');
        if (actionText) {
            let suggestions = '';
            
            if (scenario === 'suicide') {
                suggestions = 'Dispatch mental health crisis team immediately. Keep caller engaged and assess immediate risk.';
            } else if (scenario === 'medical') {
                suggestions = 'Dispatch EMS immediately. Monitor caller for additional symptoms.';
            } else if (scenario === 'accident') {
                suggestions = 'Dispatch police and EMS. Coordinate traffic control and emergency response.';
            }
            
            actionText.textContent = suggestions;
        }
    }
}

// Update operator action buttons to work with backend
function updateOperatorActionButtons() {
    // Call control buttons
    const escalateBtn = document.querySelector('button:contains("Escalate")');
    const transferBtn = document.querySelector('button:contains("Transfer")');
    const endCallBtn = document.querySelector('button:contains("End Call")');

    if (escalateBtn) {
        escalateBtn.addEventListener('click', () => {
            handleOperatorAction({
                type: 'escalate_call',
                callId: 'current_call'
            });
        });
    }
    
    if (transferBtn) {
        transferBtn.addEventListener('click', () => {
            handleOperatorAction({
                type: 'transfer_call',
                callId: 'current_call',
                department: 'crisis_hotline'
            });
        });
    }
    
    if (endCallBtn) {
        endCallBtn.addEventListener('click', () => {
            handleOperatorAction({
                type: 'end_call',
                callId: 'current_call'
            });
        });
    }

    // Emergency dispatch buttons
    const dispatchEMSBtn = document.querySelector('button:contains("Dispatch EMS")');
    const dispatchPoliceBtn = document.querySelector('button:contains("Dispatch Police")');
    const transferCallBtn = document.querySelector('button:contains("Transfer Call")');
    const addNotesBtn = document.querySelector('button:contains("Add Notes")');

    if (dispatchEMSBtn) {
        dispatchEMSBtn.addEventListener('click', () => {
            handleOperatorAction({
                type: 'dispatch_ems',
                location: '123 Main St, Apt 4B, New York, NY 10001'
            });
        });
    }
    
    if (dispatchPoliceBtn) {
        dispatchPoliceBtn.addEventListener('click', () => {
            handleOperatorAction({
                type: 'dispatch_police',
                location: '123 Main St, Apt 4B, New York, NY 10001'
            });
        });
    }
    
    if (transferCallBtn) {
        transferCallBtn.addEventListener('click', () => {
            handleOperatorAction({
                type: 'transfer_call',
                callId: 'current_call',
                department: 'crisis_hotline'
            });
        });
    }
    
    if (addNotesBtn) {
        addNotesBtn.addEventListener('click', () => {
            showNotesModal();
        });
    }

    // AI suggestion buttons
    document.querySelectorAll('.bg-gray-800 button').forEach(button => {
        button.addEventListener('click', (e) => {
            const action = e.target.textContent;
            handleAISuggestion(action);
        });
    });
}

// --- Enhanced AI Suggestions Button Handlers ---

function attachAISuggestionButtonHandlers() {
    // Wait for DOM to be ready
    setTimeout(() => {
        // 1. Dispatch Emergency Services
        const dispatchBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Dispatch Emergency Services');
        if (dispatchBtn) {
            dispatchBtn.onclick = () => showDispatchServicesModal();
        }

        // 2. Transfer to Crisis Line
        const transferBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'Transfer to Crisis Line');
        if (transferBtn) {
            transferBtn.onclick = () => showNotification('Call transferred to suicide prevention hotline!', 'success');
        }

        // 3. View Techniques
        const techniquesBtn = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.trim() === 'View Techniques');
        if (techniquesBtn) {
            techniquesBtn.onclick = () => showDeescalationTechniques();
        }
    }, 500);
}

function showDispatchServicesModal() {
    // Modal HTML
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-dark p-6 rounded-lg max-w-md w-full mx-4">
            <h3 class="text-xl font-bold mb-4">Dispatch Emergency Services</h3>
            <form id="dispatch-form" class="space-y-4">
                <label class="flex items-center space-x-2">
                    <input type="checkbox" name="service" value="Police" class="form-checkbox text-emergency"> <span>Police</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="checkbox" name="service" value="EMS" class="form-checkbox text-emergency"> <span>EMS (Ambulance)</span>
                </label>
                <label class="flex items-center space-x-2">
                    <input type="checkbox" name="service" value="Fire" class="form-checkbox text-emergency"> <span>Fire Department</span>
                </label>
                <div class="flex space-x-2 mt-4">
                    <button type="submit" class="px-4 py-2 bg-emergency text-white rounded hover:bg-red-700">Dispatch</button>
                    <button type="button" class="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500" id="cancel-dispatch">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    // Handle form submit
    modal.querySelector('#dispatch-form').onsubmit = (e) => {
        e.preventDefault();
        const checked = Array.from(modal.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
        if (checked.length === 0) {
            showNotification('Please select at least one service to dispatch.', 'warning');
            return;
        }
        showNotification(`${checked.join(' and ')} dispatched successfully!`, 'success');
        modal.remove();
    };
    // Handle cancel
    modal.querySelector('#cancel-dispatch').onclick = () => modal.remove();
}

// Attach handlers after DOM is loaded and after dashboard is shown
(function waitForDashboard() {
    if (document.getElementById('dashboard') && !document.getElementById('dashboard').classList.contains('hidden')) {
        attachAISuggestionButtonHandlers();
    } else {
        setTimeout(waitForDashboard, 500);
    }
})(); 