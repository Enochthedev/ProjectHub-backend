import { renderHook, act } from '@testing-library/react';
import { useAIAssistantStore } from '@/stores/ai-assistant';
import { api } from '@/lib/api';
import { Conversation, Message } from '@/types/ai-assistant';

// Mock the API
jest.mock('@/lib/api');
const mockedApi = api as jest.Mocked<typeof api>;

// Mock data
const mockConversation: Conversation = {
    id: 'conv-1',
    studentId: 'student-1',
    title: 'Test Conversation',
    status: 'active',
    language: 'en',
    messageCount: 2,
    messages: [],
    createdAt: '2024-01-01T00:00:00Z',
    lastMessageAt: '2024-01-01T01:00:00Z',
};

const mockMessage: Message = {
    id: 'msg-1',
    conversationId: 'conv-1',
    type: 'assistant',
    content: 'Hello! How can I help you?',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    status: 'delivered',
    confidenceScore: 0.95,
    sources: [],
    suggestedFollowUps: ['Tell me more', 'What else?'],
    isBookmarked: false,
    averageRating: 0,
};

describe('AIAssistantStore', () => {
    beforeEach(() => {
        // Reset store state before each test
        useAIAssistantStore.getState().resetState();
        jest.clearAllMocks();
    });

    describe('Conversation Management', () => {
        it('should create a new conversation', async () => {
            mockedApi.post.mockResolvedValueOnce({ data: mockConversation });

            const { result } = renderHook(() => useAIAssistantStore());

            await act(async () => {
                const conversation = await result.current.createConversation({
                    title: 'Test Conversation',
                    language: 'en',
                });
                expect(conversation).toEqual(mockConversation);
            });

            expect(result.current.conversations).toContain(mockConversation);
            expect(result.current.activeConversation).toEqual(mockConversation);
            expect(mockedApi.post).toHaveBeenCalledWith('/ai-assistant/conversations', {
                title: 'Test Conversation',
                language: 'en',
            });
        });

        it('should load conversations with filters', async () => {
            const conversations = [mockConversation];
            mockedApi.get.mockResolvedValueOnce({ data: conversations });

            const { result } = renderHook(() => useAIAssistantStore());

            await act(async () => {
                await result.current.getConversations({
                    status: 'active',
                    searchQuery: 'test',
                });
            });

            expect(result.current.conversations).toEqual(conversations);
            expect(mockedApi.get).toHaveBeenCalledWith(
                '/ai-assistant/conversations?status=active&search=test'
            );
        });

        it('should select a conversation and load messages', async () => {
            const messages = [mockMessage];
            mockedApi.get.mockResolvedValueOnce({ data: messages });

            const { result } = renderHook(() => useAIAssistantStore());

            // Set up initial state
            act(() => {
                result.current.conversations.push(mockConversation);
            });

            await act(async () => {
                await result.current.selectConversation('conv-1');
            });

            expect(result.current.activeConversation).toEqual(mockConversation);
            expect(result.current.messages).toEqual(messages);
            expect(mockedApi.get).toHaveBeenCalledWith(
                '/ai-assistant/conversations/conv-1/messages'
            );
        });

        it('should update conversation', async () => {
            const updatedConversation = { ...mockConversation, title: 'Updated Title' };
            mockedApi.patch.mockResolvedValueOnce({ data: updatedConversation });

            const { result } = renderHook(() => useAIAssistantStore());

            // Set up initial state
            act(() => {
                result.current.conversations.push(mockConversation);
                result.current.activeConversation = mockConversation;
            });

            await act(async () => {
                await result.current.updateConversation('conv-1', { title: 'Updated Title' });
            });

            expect(result.current.conversations[0]).toEqual(updatedConversation);
            expect(result.current.activeConversation).toEqual(updatedConversation);
        });

        it('should delete conversation', async () => {
            mockedApi.delete.mockResolvedValueOnce({});

            const { result } = renderHook(() => useAIAssistantStore());

            // Set up initial state
            act(() => {
                result.current.conversations.push(mockConversation);
                result.current.activeConversation = mockConversation;
            });

            await act(async () => {
                await result.current.deleteConversation('conv-1');
            });

            expect(result.current.conversations).toHaveLength(0);
            expect(result.current.activeConversation).toBeNull();
        });
    });

    describe('Message Management', () => {
        it('should send a message and receive AI response', async () => {
            const aiResponse = {
                message: mockMessage,
                suggestedFollowUps: ['Follow up 1', 'Follow up 2'],
            };
            mockedApi.post.mockResolvedValueOnce({ data: aiResponse });

            const { result } = renderHook(() => useAIAssistantStore());

            // Set up initial state
            act(() => {
                result.current.activeConversation = mockConversation;
            });

            await act(async () => {
                await result.current.sendMessage({
                    conversationId: 'conv-1',
                    content: 'Hello AI',
                });
            });

            expect(result.current.messages).toHaveLength(2); // User message + AI response
            expect(result.current.messages[1]).toEqual({
                ...mockMessage,
                suggestedFollowUps: ['Follow up 1', 'Follow up 2'],
            });
            expect(result.current.chatUI.isTyping).toBe(false);
        });

        it('should bookmark a message', async () => {
            mockedApi.post.mockResolvedValueOnce({});
            mockedApi.get.mockResolvedValueOnce({ data: [{ ...mockMessage, isBookmarked: true }] });

            const { result } = renderHook(() => useAIAssistantStore());

            // Set up initial state
            act(() => {
                result.current.messages.push(mockMessage);
            });

            await act(async () => {
                await result.current.bookmarkMessage('msg-1');
            });

            expect(result.current.messages[0].isBookmarked).toBe(true);
            expect(mockedApi.post).toHaveBeenCalledWith('/ai-assistant/messages/msg-1/bookmark');
        });

        it('should rate a message', async () => {
            mockedApi.post.mockResolvedValueOnce({});

            const { result } = renderHook(() => useAIAssistantStore());

            // Set up initial state
            act(() => {
                result.current.messages.push(mockMessage);
            });

            await act(async () => {
                await result.current.rateMessage('msg-1', 5, 'Great response!');
            });

            expect(result.current.messages[0].averageRating).toBe(5);
            expect(mockedApi.post).toHaveBeenCalledWith('/ai-assistant/messages/msg-1/rate', {
                messageId: 'msg-1',
                rating: 5,
                feedback: 'Great response!',
            });
        });

        it('should load bookmarked messages', async () => {
            const bookmarkedMessages = [{ ...mockMessage, isBookmarked: true }];
            mockedApi.get.mockResolvedValueOnce({ data: bookmarkedMessages });

            const { result } = renderHook(() => useAIAssistantStore());

            await act(async () => {
                await result.current.getBookmarkedMessages();
            });

            expect(result.current.bookmarkedMessages).toEqual(bookmarkedMessages);
        });
    });

    describe('Chat UI State', () => {
        it('should manage typing state', () => {
            const { result } = renderHook(() => useAIAssistantStore());

            act(() => {
                result.current.setTyping(true);
            });

            expect(result.current.chatUI.isTyping).toBe(true);

            act(() => {
                result.current.setTyping(false);
            });

            expect(result.current.chatUI.isTyping).toBe(false);
        });

        it('should manage suggestions visibility', () => {
            const { result } = renderHook(() => useAIAssistantStore());

            act(() => {
                result.current.showSuggestions(true);
            });

            expect(result.current.chatUI.showSuggestions).toBe(true);
        });

        it('should select messages', () => {
            const { result } = renderHook(() => useAIAssistantStore());

            act(() => {
                result.current.selectMessage('msg-1');
            });

            expect(result.current.chatUI.selectedMessageId).toBe('msg-1');
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully', async () => {
            const error = new Error('API Error');
            mockedApi.post.mockRejectedValueOnce(error);

            const { result } = renderHook(() => useAIAssistantStore());

            await act(async () => {
                try {
                    await result.current.createConversation({ title: 'Test' });
                } catch (e) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('API Error');
            expect(result.current.isLoading).toBe(false);
        });

        it('should clear errors', () => {
            const { result } = renderHook(() => useAIAssistantStore());

            act(() => {
                result.current.error = 'Test error';
            });

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Filters', () => {
        it('should set conversation filters', () => {
            const { result } = renderHook(() => useAIAssistantStore());

            const filters = { status: 'active' as const, searchQuery: 'test' };

            act(() => {
                result.current.setConversationFilters(filters);
            });

            expect(result.current.conversationFilters).toEqual(filters);
        });

        it('should clear all filters', () => {
            const { result } = renderHook(() => useAIAssistantStore());

            // Set some filters first
            act(() => {
                result.current.setConversationFilters({ status: 'active' });
                result.current.setMessageFilters({ type: 'assistant' });
            });

            act(() => {
                result.current.clearFilters();
            });

            expect(result.current.conversationFilters).toEqual({});
            expect(result.current.messageFilters).toEqual({});
        });
    });
});