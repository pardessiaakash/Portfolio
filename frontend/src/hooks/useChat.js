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
    // Scrolls only the message list itself. (scrollIntoView also scrolled
    // every container above it, including the home screen's full-screen
    // layer, which shifted the whole UI up on some window sizes.)
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            const end = messagesEndRef.current;
            if (!end) return;
            let list = end.parentElement;
            while (list && !/(auto|scroll)/.test(getComputedStyle(list).overflowY)) {
                list = list.parentElement;
            }
            if (list && list !== document.body && list !== document.documentElement) {
                list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
            }
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
                if (!err?.offline) console.error('Chat error:', err);
                setError(err?.offline ? 'offline' : 'failed');
                // A friendly reply instead of a raw error ("Failed to fetch")
                setMessages((prev) => [
                    ...prev,
                    {
                        id: genId(),
                        role: 'error',
                        offline: !!err?.offline,
                        content: err?.offline
                            ? "I'm offline right now, so I can't answer that. You can still browse Akash's case studies under Work, or reach him directly:"
                            : "Sorry, something went wrong on my side. Please try again in a moment, or reach Akash directly:",
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
