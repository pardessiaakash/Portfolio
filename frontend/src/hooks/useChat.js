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
import { streamNova } from '../api/chatApi';
import { offlineAnswer } from '../chat/offlineAnswers';

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
    // latest messages for building the history without re-creating sendMessage
    const messagesRef = useRef(messages);
    messagesRef.current = messages;
    // what the visitor is looking at (e.g. a case study), sent with each question
    const chatContextRef = useRef('');
    const setChatContext = useCallback((c) => { chatContextRef.current = c || ''; }, []);

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

            // the conversation so far (Nova answers in context, like a chat
            // assistant, not one question at a time)
            const history = [...messagesRef.current, userMessage]
                .filter((m) => (m.role === 'user' || m.role === 'ai') && m.content)
                .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
            const aiId = genId();
            let started = false;
            try {
                await streamNova(history, (text) => {
                    if (!started) {
                        started = true;
                        setMessages((prev) => [...prev, { id: aiId, role: 'ai', content: text, streaming: true, timestamp: formatTime() }]);
                    } else {
                        setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, content: text } : m)));
                    }
                    scrollToBottom();
                }, { context: chatContextRef.current });
                setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, streaming: false } : m)));
            } catch (err) {
                if (started) {
                    // cut off mid-reply: keep what arrived
                    setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, streaming: false, content: m.content + '\n\n_(The connection dropped. Ask again and I\'ll pick it up.)_' } : m)));
                    return;
                }
                // the AI server can't be reached: answer from the site's own
                // content when the question is one we know
                const local = offlineAnswer(trimmed);
                if (local) {
                    setMessages((prev) => [...prev, { id: genId(), role: 'ai', content: local, timestamp: formatTime(), offline: true }]);
                    scrollToBottom();
                    return;
                }
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
                            ? "I can't reach my AI server right now, so I can only answer the suggested topics. You can still browse the case studies under Work, or reach Akash directly:"
                            : "Sorry, something went wrong on my side. Please try again in a moment, or reach Akash directly:",
                        timestamp: formatTime(),
                    },
                ]);
                scrollToBottom();
            } finally {
                setIsLoading(false);
            }
        },
        [isLoading, scrollToBottom]
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
        setChatContext,
    };
}
