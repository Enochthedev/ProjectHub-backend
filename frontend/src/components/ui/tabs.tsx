'use client';

import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
    value: string;
    onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
    className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className = '' }) => {
    return (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div className={className}>
                {children}
            </div>
        </TabsContext.Provider>
    );
};

interface TabsListProps {
    children: React.ReactNode;
    className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className = '' }) => {
    return (
        <div className={`flex border-b border-gray-200 ${className}`}>
            {children}
        </div>
    );
};

interface TabsTriggerProps {
    value: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ 
    value, 
    children, 
    className = '',
    disabled = false 
}) => {
    const context = useContext(TabsContext);
    
    if (!context) {
        throw new Error('TabsTrigger must be used within a Tabs component');
    }

    const { value: activeValue, onValueChange } = context;
    const isActive = activeValue === value;

    return (
        <button
            type="button"
            onClick={() => !disabled && onValueChange(value)}
            disabled={disabled}
            className={`
                px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${isActive 
                    ? 'border-black text-black' 
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
        >
            {children}
        </button>
    );
};

interface TabsContentProps {
    value: string;
    children: React.ReactNode;
    className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ 
    value, 
    children, 
    className = '' 
}) => {
    const context = useContext(TabsContext);
    
    if (!context) {
        throw new Error('TabsContent must be used within a Tabs component');
    }

    const { value: activeValue } = context;
    
    if (activeValue !== value) {
        return null;
    }

    return (
        <div className={`pt-6 ${className}`}>
            {children}
        </div>
    );
};