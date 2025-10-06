'use client';

import React, { useState } from 'react';
import { Brain, MessageSquare, TrendingUp, Users, AlertCircle, X } from 'lucide-react';

type ToolType = 'progress' | 'feedback' | 'monitor' | null;
type FilterType = 'all' | 'needs-review' | 'escalated';

const SupervisorAIAssistantPage: React.FC = () => {
  const [selectedTool, setSelectedTool] = useState<ToolType>(null);
  const [interactionFilter, setInteractionFilter] = useState<FilterType>('all');
  const [showAllInteractions, setShowAllInteractions] = useState(false);
  const [generatedFeedback, setGeneratedFeedback] = useState<string>('');
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
            <button 
              onClick={() => setSelectedTool('progress')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-gray-900">Progress Analysis</h3>
              </div>
              <p className="text-sm text-gray-600">
                Get AI insights on student progress patterns and potential issues
              </p>
            </button>

            <button 
              onClick={() => setSelectedTool('feedback')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors"
            >
              <div className="flex items-center mb-2">
                <MessageSquare className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="font-medium text-gray-900">Feedback Generator</h3>
              </div>
              <p className="text-sm text-gray-600">
                Generate personalized feedback suggestions for student work
              </p>
            </button>

            <button 
              onClick={() => setSelectedTool('monitor')}
              className="p-4 text-left border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
            >
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
            <button 
              onClick={() => setShowAllInteractions(true)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All Interactions →
            </button>
          </div>
        </div>
      </div>

      {/* Tool Modals */}
      {selectedTool === 'progress' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Progress Analysis</h2>
              </div>
              <button 
                onClick={() => setSelectedTool(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-gray-900 mb-2">Overall Progress Trends</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Your students are showing an average progress rate of 78%, which is above the department average of 72%.
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">On Track</span>
                      <span className="font-medium text-green-600">8 students (67%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Needs Attention</span>
                      <span className="font-medium text-yellow-600">3 students (25%)</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">At Risk</span>
                      <span className="font-medium text-red-600">1 student (8%)</span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-medium text-gray-900 mb-2">⚠️ Students Requiring Attention</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Sarah Johnson</strong> - Milestone completion rate dropped 15% this week</li>
                    <li>• <strong>Mike Kumar</strong> - No activity logged in the past 5 days</li>
                    <li>• <strong>Emma Davis</strong> - 2 overdue milestones</li>
                  </ul>
                </div>

                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-medium text-gray-900 mb-2">✓ Positive Trends</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• <strong>Anna Lee</strong> - Completed 3 milestones ahead of schedule</li>
                    <li>• <strong>John Smith</strong> - Consistent daily progress for 2 weeks</li>
                    <li>• <strong>Lisa Chen</strong> - High engagement with AI assistant (95% helpful ratings)</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTool === 'feedback' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <MessageSquare className="h-6 w-6 text-green-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Feedback Generator</h2>
              </div>
              <button 
                onClick={() => setSelectedTool(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Student
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option>Sarah Johnson</option>
                    <option>Mike Kumar</option>
                    <option>Anna Lee</option>
                    <option>John Smith</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Feedback Context
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option>Milestone Completion</option>
                    <option>Project Progress</option>
                    <option>Code Quality</option>
                    <option>Documentation</option>
                    <option>General Performance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Add any specific points you'd like the AI to consider..."
                  />
                </div>

                <button 
                  onClick={() => setGeneratedFeedback('Great progress on the milestone completion! Sarah has shown strong technical skills in implementing the React state management solution. The code is well-structured and follows best practices.\n\nAreas for improvement:\n• Consider adding more comprehensive error handling\n• Documentation could be more detailed\n• Unit test coverage should be increased\n\nRecommendation: Schedule a code review session to discuss optimization strategies and advanced patterns.')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Generate Feedback
                </button>

                {generatedFeedback && (
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="font-medium text-gray-900 mb-2">AI-Generated Feedback Preview</h3>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {generatedFeedback}
                    </p>
                    <div className="mt-3 flex space-x-2">
                      <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
                        Copy to Clipboard
                      </button>
                      <button className="px-3 py-1 bg-white text-green-600 border border-green-600 rounded text-sm hover:bg-green-50">
                        Edit & Send
                      </button>
                    </div>
                  </div>
                )}

                {!generatedFeedback && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-2">AI-Generated Feedback Preview</h3>
                    <p className="text-sm text-gray-600 italic">
                      Click "Generate Feedback" to see AI-powered suggestions based on student progress and performance data.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showAllInteractions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">All AI Interactions</h2>
                <p className="text-sm text-gray-600 mt-1">Complete history of AI assistant interactions with your students</p>
              </div>
              <button 
                onClick={() => setShowAllInteractions(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {[
                  { initials: 'SJ', name: 'Sarah Johnson', topic: 'React state management', status: 'Resolved', color: 'blue', time: '2 hours ago', confidence: 92 },
                  { initials: 'MK', name: 'Mike Kumar', topic: 'Database optimization question', status: 'Needs Review', color: 'purple', time: '4 hours ago', confidence: 67 },
                  { initials: 'AL', name: 'Anna Lee', topic: 'Project architecture discussion', status: 'Resolved', color: 'green', time: '1 day ago', confidence: 88 },
                  { initials: 'JS', name: 'John Smith', topic: 'API integration help', status: 'Resolved', color: 'indigo', time: '1 day ago', confidence: 85 },
                  { initials: 'LC', name: 'Lisa Chen', topic: 'Testing strategies', status: 'Resolved', color: 'pink', time: '2 days ago', confidence: 91 },
                  { initials: 'ED', name: 'Emma Davis', topic: 'Git workflow question', status: 'Needs Review', color: 'yellow', time: '2 days ago', confidence: 72 },
                  { initials: 'TW', name: 'Tom Wilson', topic: 'Docker deployment', status: 'Resolved', color: 'teal', time: '3 days ago', confidence: 89 },
                ].map((interaction, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 bg-${interaction.color}-600 rounded-full flex items-center justify-center text-white text-sm font-medium`}>
                        {interaction.initials}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{interaction.name}</p>
                        <p className="text-sm text-gray-600">{interaction.topic}</p>
                        <p className="text-xs text-gray-500 mt-1">Confidence: {interaction.confidence}% • {interaction.time}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      interaction.status === 'Resolved' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {interaction.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedTool === 'monitor' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center">
                <Brain className="h-6 w-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">Interaction Monitor</h2>
              </div>
              <button 
                onClick={() => setSelectedTool(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => setInteractionFilter('all')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        interactionFilter === 'all' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      All
                    </button>
                    <button 
                      onClick={() => setInteractionFilter('needs-review')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        interactionFilter === 'needs-review' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Needs Review
                    </button>
                    <button 
                      onClick={() => setInteractionFilter('escalated')}
                      className={`px-3 py-1 rounded-lg text-sm font-medium ${
                        interactionFilter === 'escalated' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      Escalated
                    </button>
                  </div>
                  <select className="px-3 py-1 border border-gray-300 rounded-lg text-sm">
                    <option>Last 7 days</option>
                    <option>Last 30 days</option>
                    <option>All time</option>
                  </select>
                </div>

                <div className="space-y-3">
                  {(interactionFilter === 'all' || interactionFilter === 'needs-review') && (
                    <>
                      {interactionFilter === 'all' && (
                        <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-medium">
                                SJ
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">Sarah Johnson</p>
                                <p className="text-sm text-gray-600">React state management question</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Resolved
                            </span>
                          </div>
                          <div className="ml-13 text-sm text-gray-600">
                            <p className="mb-1"><strong>Confidence:</strong> 92%</p>
                            <p className="mb-1"><strong>Category:</strong> Technical Implementation</p>
                            <p className="text-xs text-gray-500">2 hours ago</p>
                          </div>
                        </div>
                      )}

                      <div className="border border-yellow-300 rounded-lg p-4 bg-yellow-50 cursor-pointer">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                              MK
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">Mike Kumar</p>
                              <p className="text-sm text-gray-600">Database optimization - complex query</p>
                            </div>
                          </div>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Needs Review
                          </span>
                        </div>
                        <div className="ml-13 text-sm text-gray-600">
                          <p className="mb-1"><strong>Confidence:</strong> 67%</p>
                          <p className="mb-1"><strong>Category:</strong> Database Design</p>
                          <p className="text-xs text-gray-500">4 hours ago</p>
                        </div>
                      </div>
                    </>
                  )}

                  {interactionFilter === 'all' && (
                    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-medium">
                            AL
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Anna Lee</p>
                            <p className="text-sm text-gray-600">Project architecture discussion</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Resolved
                        </span>
                      </div>
                      <div className="ml-13 text-sm text-gray-600">
                        <p className="mb-1"><strong>Confidence:</strong> 88%</p>
                        <p className="mb-1"><strong>Category:</strong> System Design</p>
                        <p className="text-xs text-gray-500">1 day ago</p>
                      </div>
                    </div>
                  )}

                  {interactionFilter === 'escalated' && (
                    <div className="border border-red-300 rounded-lg p-4 bg-red-50 cursor-pointer">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-medium">
                            ED
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Emma Davis</p>
                            <p className="text-sm text-gray-600">Critical project deadline concern</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Escalated
                        </span>
                      </div>
                      <div className="ml-13 text-sm text-gray-600">
                        <p className="mb-1"><strong>Confidence:</strong> 45%</p>
                        <p className="mb-1"><strong>Category:</strong> Project Management</p>
                        <p className="text-xs text-gray-500">6 hours ago</p>
                      </div>
                    </div>
                  )}

                  {((interactionFilter === 'needs-review' && false) || (interactionFilter === 'escalated' && false)) && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No interactions found for this filter</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupervisorAIAssistantPage;