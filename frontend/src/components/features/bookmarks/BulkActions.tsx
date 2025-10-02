'use client';

import React, { useState } from 'react';
import { useBookmarkStore } from '@/stores/bookmark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { 
    Trash2, 
    FolderOpen, 
    X, 
    CheckSquare,
    Square
} from 'lucide-react';

export const BulkActions: React.FC = () => {
    const {
        selectedBookmarks,
        categories,
        bulkDeleteBookmarks,
        bulkMoveToCategory,
        clearSelection,
        selectAllBookmarks,
        bookmarks,
        isBulkOperationInProgress
    } = useBookmarkStore();
    
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const allSelected = selectedBookmarks.length === bookmarks.length;
    const someSelected = selectedBookmarks.length > 0 && selectedBookmarks.length < bookmarks.length;

    const handleSelectAll = () => {
        if (allSelected) {
            clearSelection();
        } else {
            selectAllBookmarks();
        }
    };

    const handleBulkDelete = async () => {
        try {
            await bulkDeleteBookmarks();
            setShowDeleteConfirm(false);
        } catch (error) {
            console.error('Failed to delete bookmarks:', error);
        }
    };

    const handleMoveToCategory = async (categoryId: string) => {
        try {
            await bulkMoveToCategory(categoryId);
            setShowMoveModal(false);
        } catch (error) {
            console.error('Failed to move bookmarks:', error);
        }
    };

    return (
        <>
            <Card className="p-4 bg-gray-50 border-2 border-gray-300">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* Select All Checkbox */}
                        <button
                            onClick={handleSelectAll}
                            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-black"
                        >
                            {allSelected ? (
                                <CheckSquare className="w-4 h-4" />
                            ) : someSelected ? (
                                <div className="w-4 h-4 border-2 border-gray-400 bg-gray-400" />
                            ) : (
                                <Square className="w-4 h-4" />
                            )}
                            {allSelected ? 'Deselect All' : 'Select All'}
                        </button>
                        
                        {/* Selection Count */}
                        <span className="text-sm text-gray-600">
                            {selectedBookmarks.length} bookmark{selectedBookmarks.length !== 1 ? 's' : ''} selected
                        </span>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowMoveModal(true)}
                            disabled={isBulkOperationInProgress}
                        >
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Move to Category
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={isBulkOperationInProgress}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Selected
                        </Button>
                        
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearSelection}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Move to Category Modal */}
            <Modal
                isOpen={showMoveModal}
                onClose={() => setShowMoveModal(false)}
                title="Move Bookmarks to Category"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Move {selectedBookmarks.length} bookmark{selectedBookmarks.length !== 1 ? 's' : ''} to which category?
                    </p>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {/* Remove from category option */}
                        <button
                            onClick={() => handleMoveToCategory('')}
                            disabled={isBulkOperationInProgress}
                            className="w-full text-left p-3 border-2 border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
                        >
                            <div className="font-medium text-gray-600">
                                Remove from Category
                            </div>
                            <div className="text-sm text-gray-500">
                                Move to uncategorized
                            </div>
                        </button>
                        
                        {/* Category options */}
                        {categories.map((category) => (
                            <button
                                key={category.id}
                                onClick={() => handleMoveToCategory(category.id)}
                                disabled={isBulkOperationInProgress}
                                className="w-full text-left p-3 border-2 border-gray-200 hover:border-gray-300 transition-colors disabled:opacity-50"
                            >
                                <div className="font-medium">{category.name}</div>
                                {category.description && (
                                    <div className="text-sm text-gray-500">
                                        {category.description}
                                    </div>
                                )}
                            </button>
                        ))}
                        
                        {categories.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                No categories available. Create a category first.
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => setShowMoveModal(false)}
                            disabled={isBulkOperationInProgress}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Delete Bookmarks"
            >
                <div className="space-y-4">
                    <p className="text-gray-600">
                        Are you sure you want to delete {selectedBookmarks.length} bookmark{selectedBookmarks.length !== 1 ? 's' : ''}? 
                        This action cannot be undone.
                    </p>
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isBulkOperationInProgress}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleBulkDelete}
                            disabled={isBulkOperationInProgress}
                            loading={isBulkOperationInProgress}
                        >
                            Delete Bookmarks
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};