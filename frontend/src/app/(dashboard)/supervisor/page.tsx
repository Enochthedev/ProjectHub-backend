'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  Calendar,
  MessageSquare,
  Bot,
  Settings
} from 'lucide-react';
import { useSupervisorStore } from '@/stores/supervisor';
import { useAuthStore } from '@/stores/auth';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function SupervisorDashboard() {
  const { user } = useAuthStore();
  const {
    dashboard,
    availability,
    aiInteractionOverview,
    communicationOverview,
    isLoadingDashboard,
    isLoadingAvailability,
    isLoadingAIInteractions,
    isLoadingCommunication,
    dashboardError,
    fetchDashboard,
    fetchAvailability,
    fetchAIInteractionOverview,
    fetchCommunicationOverview,
  } = useSupervisorStore();

  useEffect(() => {
    if (user?.role === 'supervisor') {
      fetchDashboard();
      fetchAvailability();
      fetchAIInteractionOverview();
      fetchCommunicationOverview();
    }
  }, [user, fetchDashboard, fetchAvailability, fetchAIInteractionOverview, fetchCommunicationOverview]);

  if (user?.role !== 'supervisor') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Access denied. This page is only available to supervisors.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoadingDashboard) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{dashboardError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supervisor Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {dashboard?.supervisorName || user?.firstName}
          </p>
        </div>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalStudents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active supervised students
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.metrics.overallCompletionRate.toFixed(1) || 0}%
            </div>
            <Progress 
              value={dashboard?.metrics.overallCompletionRate || 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk Students</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboard?.metrics.atRiskStudentCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress Velocity</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.metrics.averageProgressVelocity.toFixed(1) || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Milestones per week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="ai-monitoring">AI Monitoring</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest student interactions</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.recentActivity?.length ? (
                  <div className="space-y-3">
                    {dashboard.recentActivity.slice(0, 5).map((activity, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.studentName}</p>
                          <p className="text-xs text-muted-foreground">{activity.activity}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {new Date(activity.timestamp).toLocaleDateString()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard?.upcomingDeadlines?.length ? (
                  <div className="space-y-3">
                    {dashboard.upcomingDeadlines.slice(0, 5).map((deadline, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{deadline.milestoneTitle}</p>
                          <p className="text-xs text-muted-foreground">{deadline.studentName}</p>
                        </div>
                        <div className="text-right">
                          <Badge 
                            variant={deadline.daysUntilDue <= 1 ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {deadline.daysUntilDue} days
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming deadlines</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* At Risk Students */}
          {dashboard?.atRiskStudents?.length ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                  Students Requiring Attention
                </CardTitle>
                <CardDescription>Students with overdue or blocked milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {dashboard.atRiskStudents.map((student) => (
                    <Card key={student.studentId} className="border-orange-200">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{student.studentName}</h4>
                          <Badge variant={
                            student.riskLevel === 'high' ? 'destructive' : 
                            student.riskLevel === 'medium' ? 'default' : 'secondary'
                          }>
                            {student.riskLevel} risk
                          </Badge>
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {student.riskFactors.map((factor, index) => (
                            <p key={index}>• {factor}</p>
                          ))}
                        </div>
                        <div className="mt-3 space-y-1">
                          {student.recommendedActions.slice(0, 2).map((action, index) => (
                            <p key={index} className="text-xs text-blue-600">→ {action}</p>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Availability Management
              </CardTitle>
              <CardDescription>Manage your office hours and meeting slots</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAvailability ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : availability ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{availability.totalWeeklyCapacity}</div>
                      <p className="text-sm text-muted-foreground">Weekly Hours</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{availability.utilizationRate.toFixed(1)}%</div>
                      <p className="text-sm text-muted-foreground">Utilization</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{availability.availabilitySlots.length}</div>
                      <p className="text-sm text-muted-foreground">Time Slots</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Current Availability</h4>
                    {availability.availabilitySlots.map((slot) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][slot.dayOfWeek]}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {slot.startTime} - {slot.endTime} • {slot.location}
                          </p>
                        </div>
                        <Badge variant={slot.type === 'office_hours' ? 'default' : 'secondary'}>
                          {slot.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No availability data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai-monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                AI Interaction Monitoring
              </CardTitle>
              <CardDescription>Review and oversee AI assistant conversations</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAIInteractions ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : aiInteractionOverview ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{aiInteractionOverview.stats.totalReviewed}</div>
                      <p className="text-sm text-muted-foreground">Total Reviewed</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{aiInteractionOverview.stats.pendingReviews}</div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{aiInteractionOverview.stats.escalatedConversations}</div>
                      <p className="text-sm text-muted-foreground">Escalated</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{aiInteractionOverview.stats.averageConfidenceScore.toFixed(2)}</div>
                      <p className="text-sm text-muted-foreground">Avg Confidence</p>
                    </div>
                  </div>

                  {aiInteractionOverview.priorityReviews.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Priority Reviews</h4>
                      <div className="space-y-2">
                        {aiInteractionOverview.priorityReviews.map((review) => (
                          <div key={review.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium">{review.studentName}</p>
                              <p className="text-sm text-muted-foreground">
                                {review.categories.join(', ')} • Confidence: {review.confidenceScore?.toFixed(2) || 'N/A'}
                              </p>
                            </div>
                            <Badge variant={
                              review.status === 'escalated' ? 'destructive' :
                              review.status === 'flagged' ? 'destructive' :
                              review.status === 'pending' ? 'default' : 'secondary'
                            }>
                              {review.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No AI interaction data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="communication" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Student Communication
              </CardTitle>
              <CardDescription>Messages and meetings with students</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingCommunication ? (
                <div className="flex items-center justify-center h-32">
                  <LoadingSpinner />
                </div>
              ) : communicationOverview ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{communicationOverview.stats.totalMessagesSent}</div>
                      <p className="text-sm text-muted-foreground">Messages Sent</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{communicationOverview.stats.totalMeetingsScheduled}</div>
                      <p className="text-sm text-muted-foreground">Meetings Scheduled</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{communicationOverview.stats.averageResponseTime}</div>
                      <p className="text-sm text-muted-foreground">Avg Response Time</p>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold">{communicationOverview.stats.mostActiveStudent}</div>
                      <p className="text-sm text-muted-foreground">Most Active Student</p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Upcoming Meetings */}
                    <div>
                      <h4 className="font-medium mb-2">Upcoming Meetings</h4>
                      {communicationOverview.upcomingMeetings.length > 0 ? (
                        <div className="space-y-2">
                          {communicationOverview.upcomingMeetings.slice(0, 3).map((meeting) => (
                            <div key={meeting.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium">{meeting.title}</p>
                                <Badge variant="outline">{meeting.status}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {meeting.studentName} • {new Date(meeting.dateTime).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No upcoming meetings</p>
                      )}
                    </div>

                    {/* Recent Messages */}
                    <div>
                      <h4 className="font-medium mb-2">Recent Messages</h4>
                      {communicationOverview.recentMessages.length > 0 ? (
                        <div className="space-y-2">
                          {communicationOverview.recentMessages.slice(0, 3).map((message) => (
                            <div key={message.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium">{message.subject}</p>
                                <Badge variant="outline">{message.type}</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                To: {message.studentName} • {new Date(message.sentAt).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No recent messages</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No communication data</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}