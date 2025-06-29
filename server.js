const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Store active calls
const activeCalls = new Map();
const callTranscripts = new Map();

// Emergency Services Simulation
const emergencyServices = {
    police: { available: true, units: 5, responseTime: '3-5 minutes' },
    ems: { available: true, units: 3, responseTime: '2-4 minutes' },
    fire: { available: true, units: 2, responseTime: '4-6 minutes' }
};

// Socket.IO Connection Handling
io.on('connection', (socket) => {
    console.log('🔌 Dashboard connected:', socket.id);

    // Send initial emergency services status
    socket.emit('emergency-services-status', emergencyServices);

    // Handle operator actions
    socket.on('operator-action', (action) => {
        console.log('👮 Operator action:', action);
        handleOperatorAction(action, socket);
    });

    // Handle manual call simulation
    socket.on('simulate-call', (callData) => {
        console.log('📞 Simulating call:', callData);
        simulateEmergencyCall(callData, socket);
    });

    // Handle real-time transcript updates
    socket.on('transcript-update', (data) => {
        console.log('📝 Transcript update:', data);
        updateCallTranscript(data.callId, data.transcript);
        socket.broadcast.emit('transcript-updated', data);
    });

    socket.on('disconnect', () => {
        console.log('🔌 Dashboard disconnected:', socket.id);
    });
});

// Handle operator actions
function handleOperatorAction(action, socket) {
    console.log('👮 Processing operator action:', action);
    
    switch (action.type) {
        case 'dispatch_police':
            dispatchEmergencyService('police', action.location, socket);
            break;
        case 'dispatch_ems':
            dispatchEmergencyService('ems', action.location, socket);
            break;
        case 'dispatch_fire':
            dispatchEmergencyService('fire', action.location, socket);
            break;
        case 'escalate_call':
            escalateCall(action.callId, socket);
            break;
        case 'transfer_call':
            transferCall(action.callId, action.department, socket);
            break;
        case 'end_call':
            endCall(action.callId, socket);
            break;
        default:
            console.log('Unknown operator action:', action.type);
    }
}

// Dispatch emergency services
function dispatchEmergencyService(service, location, socket) {
    console.log(`🚨 Dispatching ${service} to ${location}`);
    
    if (emergencyServices[service].units > 0) {
        emergencyServices[service].units--;
        
        // Simulate response time
        setTimeout(() => {
            emergencyServices[service].units++;
            socket.emit('service-response', {
                service: service,
                location: location,
                status: 'arrived',
                responseTime: emergencyServices[service].responseTime
            });
        }, Math.random() * 30000 + 30000); // 30-60 seconds
        
        socket.emit('service-dispatched', {
            service: service,
            location: location,
            units: emergencyServices[service].units,
            estimatedArrival: emergencyServices[service].responseTime
        });
        
        io.emit('emergency-services-status', emergencyServices);
    } else {
        socket.emit('service-unavailable', {
            service: service,
            message: 'No units available'
        });
    }
}

// Simulate emergency call
function simulateEmergencyCall(callData, socket) {
    const callId = 'sim_' + Date.now();
    
    console.log('📞 Simulating emergency call:', callData);
    
    // Create call record
    activeCalls.set(callId, {
        from: callData.phoneNumber || '+15551234567',
        to: process.env.TWILIO_PHONE_NUMBER,
        startTime: new Date(),
        status: 'active',
        transcript: []
    });
    
    // Notify dashboard
    io.emit('new-call', {
        callId: callId,
        from: callData.phoneNumber || '+15551234567',
        to: process.env.TWILIO_PHONE_NUMBER,
        startTime: new Date(),
        isSimulated: true
    });
    
    // Simulate transcript updates
    simulateTranscriptUpdates(callId, callData.scenario);
}

// Simulate transcript updates
function simulateTranscriptUpdates(callId, scenario) {
    const scenarios = {
        'suicide': [
            "I don't know if I can do this anymore...",
            "I have pills here and I'm thinking about ending it all.",
            "Everything feels so hopeless right now.",
            "I just want the pain to stop."
        ],
        'accident': [
            "There's been a terrible accident on the highway.",
            "Multiple cars are involved and there's debris everywhere.",
            "I can see people trapped in their vehicles.",
            "We need emergency services immediately!"
        ],
        'medical': [
            "My husband is having severe chest pain.",
            "He's having trouble breathing and looks pale.",
            "I think it might be a heart attack.",
            "Please send an ambulance quickly!"
        ]
    };
    
    const transcript = scenarios[scenario] || scenarios['suicide'];
    let index = 0;
    
    const interval = setInterval(() => {
        if (index < transcript.length) {
            const entry = {
                callId: callId,
                speaker: 'Caller',
                text: transcript[index],
                timestamp: new Date()
            };
            
            updateCallTranscript(callId, entry);
            io.emit('transcript-updated', entry);
            
            index++;
        } else {
            clearInterval(interval);
        }
    }, 3000); // Add new transcript entry every 3 seconds
}

// Update call transcript
function updateCallTranscript(callId, transcriptEntry) {
    if (!callTranscripts.has(callId)) {
        callTranscripts.set(callId, []);
    }
    
    const transcript = callTranscripts.get(callId);
    transcript.push(transcriptEntry);
    
    // Keep only last 50 entries
    if (transcript.length > 50) {
        transcript.splice(0, transcript.length - 50);
    }
}

// Escalate call
function escalateCall(callId, socket) {
    console.log('🚨 Escalating call:', callId);
    socket.emit('call-escalated', { callId: callId });
}

// Transfer call
function transferCall(callId, department, socket) {
    console.log('🔄 Transferring call:', callId, 'to', department);
    socket.emit('call-transferred', { 
        callId: callId, 
        department: department 
    });
}

// End call
function endCall(callId, socket) {
    console.log('📞 Ending call:', callId);
    
    if (activeCalls.has(callId)) {
        const call = activeCalls.get(callId);
        call.status = 'completed';
        call.endTime = new Date();
        
        activeCalls.delete(callId);
        callTranscripts.delete(callId);
        
        socket.emit('call-ended', { callId: callId });
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        activeCalls: activeCalls.size,
        timestamp: new Date()
    });
});

// Get active calls
app.get('/api/calls', (req, res) => {
    const calls = Array.from(activeCalls.entries()).map(([id, call]) => ({
        id: id,
        ...call
    }));
    
    res.json(calls);
});

// Get call transcript
app.get('/api/calls/:callId/transcript', (req, res) => {
    const callId = req.params.callId;
    const transcript = callTranscripts.get(callId) || [];
    
    res.json(transcript);
});

// Gemini AI: De-escalation tips endpoint
app.post('/api/gemini-tips', async (req, res) => {
    const { transcript } = req.body;
    const prompt = `You are an expert crisis counselor. Based on this emergency call transcript, generate 3 to 5 specific, actionable de-escalation techniques the operator can use right now. Make them concise and practical. Respond as a JSON array of strings.\n\nTranscript: "${transcript}"`;
    try {
        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + process.env.GOOGLE_GEMINI_API_KEY,
            {
                contents: [{ parts: [{ text: prompt }] }]
            },
            { headers: { 'Content-Type': 'application/json' } }
        );
        const text = response.data.candidates[0].content.parts[0].text;
        const jsonMatch = text.match(/\[.*\]/s);
        if (jsonMatch) {
            const tips = JSON.parse(jsonMatch[0]);
            return res.json({ tips });
        }
        return res.status(200).json({ tips: [] });
    } catch (err) {
        console.error('Gemini API error:', err.message);
        return res.status(500).json({ tips: [], error: 'Gemini API error' });
    }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`🚀 Emergency Response AI Server running on port ${PORT}`);
    console.log(`🔌 WebSocket server ready for dashboard connections`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = { app, io, activeCalls, callTranscripts }; 