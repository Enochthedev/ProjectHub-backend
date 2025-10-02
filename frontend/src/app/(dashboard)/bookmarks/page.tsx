'use client';

import React from 'react';
import { BookmarkGrid, ComparisonButton } from '@/components/features/bookmarks';

export default function BookmarksPage() {
    return (
        <div className="container mx-auto px-4 py-8">
            <BookmarkGrid />
            <ComparisonButton />
        </div>
    );
}