'use client';

import React from 'react';
import { Brain, MessageSquare, TrendingUp, Users, AlertCircle } from 'lucide-react';

const SupervisorAIAssistantPage: React.FC = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
          <p className="text-gray-600 mt-1">
            AI-powered tools and insights for supervision and project management
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">AI Interactions</p>
              <p className="text-2xl font-bold text-gray-900">127</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Insights Generated</p>
              <p className="text-2xl font-bold text-gray-900">43</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Students Assisted</p>
              <p className="text-2xl font-bold text-gray-900">12</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alerts</p>
              <p className="text-2xl font-bold text-gray-900">3</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI Chat Interface */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center">
              <Brain className="h-5 w-5 text-blue-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant Chat</h2>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Get AI-powered insights about your students and projects
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4 mb-4 h-64 overflow-y-auto bg-gray-50 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <Brain className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white p-3 rounded-lg border">
                    <p className="text-sm text-gray-900">
                      Hello! I'm your AI assistant. I can help you with student progress analysis, 
                      project recommendations, and supervision insights. What would you like to know?
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Ask about student progress, project insights, or supervision tips..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Recent Insights */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Recent AI Insights</h2>
            <p className="text-sm text-gray-600 mt-1">
              Latest AI-generated insights about your supervision
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Student Progress Alert</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Sarah Johnson's project milestone completion rate has decreased by 15% 
                      this week. Consider scheduling a check-in meeting.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">2 hours ago</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-start space-x-3">
                  <Users className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Collaboration Opportunity</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Two of your students are working on similar ML projects. 
                      Consider introducing them for potential collaboration.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">1 day ago</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-start space-x-3">
                  <Brain className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-gray-900">Resource Recommendation</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Based on current project trends, consider adding more 
                      cloud computing resources to your project offerings.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">2 days ago</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Tools Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">AI-Powered Supervision Tools</h2>
          <p className="text-sm text-gray-600 mt-1">
            Specialized tools to enhance your supervision effectiveness
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-gray-900">Progress Analysis</h3>
              </div>
              <p className="text-sm text-gray-600">
                Get AI insights on student progress patterns and potential issues
              </p>
            </button>

            <button className="p-4 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors">
              <div className="flex items-center mb-2">
                <MessageSquare className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-medium text-gray-900">Feedback Generator</h3>
              </div>
              <p className="text-sm text-gray-600">
                Generate personalized feedback suggestions for student work
              </p>
            </button>

            <button className="p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors">
              <div className="flex items-center mb-2">
                <Brain className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="font-medium text-gray-900">Interaction Monitor</h3>
              </div>
              <p className="text-sm text-gray-600">
                Monitor and review AI interactions with your students
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Simple AI Interaction Overview */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent AI Interactions</h2>
          <p className="text-sm text-gray-600 mt-1">
            Overview of recent AI assistant interactions with your students
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  SJ
                </div>
                <div>
                  <p className="font-medium text-gray-900">Sarah Johnson</p>
                  <p className="text-sm text-gray-600">Asked about React state management</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">2 hours ago</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Resolved
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  MK
                </div>
                <div>
                  <p className="font-medium text-gray-900">Mike Kumar</p>
                  <p className="text-sm text-gray-600">Database optimization question</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">4 hours ago</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  Needs Review
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  AL
                </div>
                <div>
                  <p className="font-medium text-gray-900">Anna Lee</p>
                  <p className="text-sm text-gray-600">Project architecture discussion</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">1 day ago</p>
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Resolved
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All Interactions →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupervisorAIAssistantPage;