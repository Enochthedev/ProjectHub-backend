'use client';

import React, { useState } from 'react';
import { useBookmarkStore } from '@/stores/bookmark';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { 
    Plus, 
    Search, 
    Filter as FilterIcon,
    Folder,
    Tag,
    Calendar,
    User
} from 'lucide-react';

export const BookmarkFilters: React.FC = () => {
    const {
        categories,
        selectedCategory,
        setSelectedCategory,
        createCategory,
        isCreatingCategory
    } = useBookmarkStore();
    
    const [showCreateCategory, setShowCreateCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const handleCreateCategory = async () => {
        if (!newCategoryName.trim()) return;
        
        try {
            await createCategory(newCategoryName.trim(), newCategoryDescription.trim() || undefined);
            setNewCategoryName('');
            setNewCategoryDescription('');
            setShowCreateCategory(false);
        } catch (error) {
            console.error('Failed to create category:', error);
        }
    };

    const filteredCategories = categories.filter(category =>
        category.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <>
            <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-black flex items-center">
                        <FilterIcon className="w-4 h-4 mr-2" />
                        Filter Bookmarks
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            setSelectedCategory(null);
                            setSearchQuery('');
                        }}
                    >
                        Clear All
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Search Categories
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>

                    {/* Categories */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-700">
                                Categories
                            </label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCreateCategory(true)}
                            >
                                <Plus className="w-4 h-4 mr-1" />
                                New
                            </Button>
                        </div>
                        
                        <div className="space-y-2">
                            {/* All Bookmarks */}
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className={`w-full text-left p-3 border-2 transition-colors ${
                                    selectedCategory === null
                                        ? 'border-black bg-gray-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Folder className="w-4 h-4 mr-2 text-gray-500" />
                                        <span className="font-medium">All Bookmarks</span>
                                    </div>
                                    <Badge variant="outline">
                                        {categories.reduce((sum, cat) => sum + cat.bookmarkCount, 0)}
                                    </Badge>
                                </div>
                            </button>

                            {/* Uncategorized */}
                            <button
                                onClick={() => setSelectedCategory('uncategorized')}
                                className={`w-full text-left p-3 border-2 transition-colors ${
                                    selectedCategory === 'uncategorized'
                                        ? 'border-black bg-gray-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Folder className="w-4 h-4 mr-2 text-gray-400" />
                                        <span className="text-gray-600">Uncategorized</span>
                                    </div>
                                </div>
                            </button>

                            {/* Category List */}
                            {filteredCategories.map((category) => (
                                <button
                                    key={category.id}
                                    onClick={() => setSelectedCategory(category.id)}
                                    className={`w-full text-left p-3 border-2 transition-colors ${
                                        selectedCategory === category.id
                                            ? 'border-black bg-gray-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <Folder className="w-4 h-4 mr-2 text-gray-500" />
                                            <div>
                                                <div className="font-medium">{category.name}</div>
                                                {category.description && (
                                                    <div className="text-sm text-gray-500">
                                                        {category.description}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Badge variant="outline">
                                            {category.bookmarkCount}
                                        </Badge>
                                    </div>
                                </button>
                            ))}

                            {filteredCategories.length === 0 && searchQuery && (
                                <div className="text-center py-4 text-gray-500">
                                    No categories found matching &ldquo;{searchQuery}&rdquo;
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Filters */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Quick Filters
                        </label>
                        <div className="space-y-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                            >
                                <Calendar className="w-4 h-4 mr-2" />
                                Recently Added
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                            >
                                <Tag className="w-4 h-4 mr-2" />
                                With Notes
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                            >
                                <User className="w-4 h-4 mr-2" />
                                By Supervisor
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Create Category Modal */}
            <Modal
                isOpen={showCreateCategory}
                onClose={() => setShowCreateCategory(false)}
                title="Create New Category"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Category Name *
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter category name"
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Description (Optional)
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter category description"
                            value={newCategoryDescription}
                            onChange={(e) => setNewCategoryDescription(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            variant="secondary"
                            onClick={() => setShowCreateCategory(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleCreateCategory}
                            disabled={!newCategoryName.trim() || isCreatingCategory}
                            loading={isCreatingCategory}
                        >
                            Create Category
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};