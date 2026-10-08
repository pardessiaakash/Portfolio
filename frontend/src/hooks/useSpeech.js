/**
 * useSpeech.js — Custom hook for speech-to-text
 *
 * Two approaches:
 *   1. Browser Web Speech API (no backend, instant, English-only)
 *   2. Backend Whisper API (better accuracy, any language)
 *
 * Strategy:
 *   - Use browser Web Speech API for live transcript preview
 *   - When recording stops, also send to backend for better accuracy (optional)
 *   - Returns transcript text that user can edit before sending
 */

import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeech({ onTranscript, useBackend = false, onBackendTranscript }) {
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');
    const [error, setError] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false); // Backend processing

    // Web Speech API ref
    const recognitionRef = useRef(null);
    // MediaRecorder ref (for backend Whisper)
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    // ------------------------------------------------------------------
    // Initialize Web Speech API
    // ------------------------------------------------------------------
    const isWebSpeechSupported = () =>
        'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;

    const setupRecognition = useCallback(() => {
        const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) return null;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;      // Single utterance
        recognition.interimResults = true;   // Show live transcript
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setInterimText('');
            setError(null);
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            setInterimText(interim);
            if (final && onTranscript) {
                onTranscript(final.trim());
                setInterimText('');
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
            setInterimText('');
        };

        return recognition;
    }, [onTranscript]);

    // ------------------------------------------------------------------
    // Start / Stop recording
    // ------------------------------------------------------------------
    const startListening = useCallback(async () => {
        if (isListening) return;

        setError(null);

        // Always use Web Speech API for live transcript
        if (isWebSpeechSupported()) {
            const recognition = setupRecognition();
            if (recognition) {
                recognitionRef.current = recognition;
                try {
                    recognition.start();
                } catch (err) {
                    setError('Failed to start speech recognition.');
                    console.error(err);
                }
            }
        } else {
            setError('Speech recognition is not supported in your browser. Use Chrome for best results.');
            return;
        }

        // Optionally also capture audio for backend Whisper
        if (useBackend) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                chunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach((t) => t.stop());
                    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

                    if (onBackendTranscript && audioBlob.size > 0) {
                        setIsProcessing(true);
                        try {
                            await onBackendTranscript(audioBlob);
                        } finally {
                            setIsProcessing(false);
                        }
                    }
                };

                mediaRecorderRef.current = mediaRecorder;
                mediaRecorder.start();
            } catch (err) {
                console.error('MediaRecorder error:', err);
                // Non-fatal — Web Speech API still works
            }
        }
    }, [isListening, setupRecognition, useBackend, onBackendTranscript]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsListening(false);
    }, []);

    const toggleListening = useCallback(() => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    }, [isListening, startListening, stopListening]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) recognitionRef.current.abort();
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, []);

    return {
        isListening,
        interimText,
        error,
        isProcessing,
        toggleListening,
        startListening,
        stopListening,
        isSupported: isWebSpeechSupported(),
    };
}
