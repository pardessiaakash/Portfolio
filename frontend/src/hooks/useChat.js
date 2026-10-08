/**
 * useChat.js — Custom hook managing chat state and API calls
 *
 * Manages:
 *   - Messages list
 *   - Loading / error states
 *   - Mode (ai | web) and project selection
 *   - Sending messages through the RAG API
 */

import { useState, useCallback, useRef } from 'react';
import { sendChatMessage } from '../api/chatApi';

// Unique ID generator
let messageIdCounter = 0;
const genId = () => `msg_${++messageIdCounter}_${Date.now()}`;

// Format timestamp
const formatTime = () =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function useChat() {
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [mode, setMode] = useState('ai'); // 'ai' | 'web'
    const [projectId, setProjectId] = useState('');

    const messagesEndRef = useRef(null);

    // ------------------------------------------------------------------
    // Scroll to bottom
    // ------------------------------------------------------------------
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    }, []);

    // ------------------------------------------------------------------
    // Send message
    // ------------------------------------------------------------------
    const sendMessage = useCallback(
        async (inputText) => {
            const trimmed = inputText.trim();
            if (!trimmed || isLoading) return;

            setError(null);

            // Add user message immediately
            const userMessage = {
                id: genId(),
                role: 'user',
                content: trimmed,
                timestamp: formatTime(),
            };
            setMessages((prev) => [...prev, userMessage]);
            scrollToBottom();
            setIsLoading(true);

            try {
                const data = await sendChatMessage(
                    trimmed,
                    mode,
                    mode === 'web' ? projectId || null : null
                );

                // Add AI response
                const aiMessage = {
                    id: genId(),
                    role: 'ai',
                    content: data.answer,
                    sources: data.sources || [],
                    timestamp: formatTime(),
                    mode: data.mode,
                    project_id: data.project_id,
                };
                setMessages((prev) => [...prev, aiMessage]);
                scrollToBottom();
            } catch (err) {
                console.error('Chat error:', err);
                setError(err.message || 'Failed to get a response. Check the backend.');
                // Add error message in the chat
                setMessages((prev) => [
                    ...prev,
                    {
                        id: genId(),
                        role: 'error',
                        content: err.message || 'Something went wrong.',
                        timestamp: formatTime(),
                    },
                ]);
                scrollToBottom();
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, mode, projectId, scrollToBottom]
    );

    // ------------------------------------------------------------------
    // Clear chat
    // ------------------------------------------------------------------
    const clearChat = useCallback(() => {
        setMessages([]);
        setError(null);
    }, []);

    return {
        messages,
        isLoading,
        error,
        mode,
        setMode,
        projectId,
        setProjectId,
        sendMessage,
        clearChat,
        messagesEndRef,
    };
}
