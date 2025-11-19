/**
 * Stockfish Web Worker Factory
 * This file is loaded via @require and provides a function to create the worker
 */

(function(global) {
    'use strict';
    
    global.createStockfishWorker = function() {
        const workerCode = `
/**
 * Stockfish Web Worker - Runs in background thread
 */
'use strict';

// Import Stockfish engine from CDN
importScripts('https://cdn.jsdelivr.net/gh/AlphaZero-Chess/del@refs/heads/main/stockfish1.js');

let engine = null;
let isReady = false;

function initEngine() {
    try {
        if (typeof STOCKFISH === 'function') {
            engine = STOCKFISH();
            
            engine.onmessage = function(event) {
                self.postMessage({
                    type: 'engine-message',
                    data: event
                });
                
                if (event.includes('readyok')) {
                    isReady = true;
                }
            };
            
            self.postMessage({ type: 'worker-ready' });
        } else {
            self.postMessage({ 
                type: 'worker-error', 
                error: 'Stockfish not available in worker context' 
            });
        }
    } catch (error) {
        self.postMessage({ 
            type: 'worker-error', 
            error: 'Failed to initialize engine: ' + error.message 
        });
    }
}

self.onmessage = function(e) {
    const { type, command } = e.data;
    
    switch(type) {
        case 'init':
            initEngine();
            break;
            
        case 'command':
            if (engine) {
                try {
                    engine.postMessage(command);
                } catch (error) {
                    self.postMessage({ 
                        type: 'worker-error', 
                        error: 'Engine command failed: ' + error.message 
                    });
                }
            } else {
                self.postMessage({ 
                    type: 'worker-error', 
                    error: 'Engine not initialized' 
                });
            }
            break;
            
        case 'stop':
            if (engine) {
                engine.postMessage('stop');
            }
            break;
            
        case 'quit':
            if (engine) {
                engine.postMessage('quit');
            }
            self.close();
            break;
            
        default:
            self.postMessage({ 
                type: 'worker-error', 
                error: 'Unknown command type: ' + type 
            });
    }
};

// Auto-initialize on load
initEngine();
`;
        
        try {
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            const worker = new Worker(workerUrl);
            return worker;
        } catch (error) {
            console.error('[WORKER FACTORY] Failed to create worker:', error);
            return null;
        }
    };
    
})(typeof window !== 'undefined' ? window : this);
