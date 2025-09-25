# AI-Powered Recommendations User Guide

## Overview

The AI-Powered Recommendations system helps students discover final year projects that match their skills, interests, and career goals. Using advanced machine learning algorithms, the system analyzes your profile and provides personalized project suggestions with detailed explanations.

## Getting Started

### Prerequisites

1. **Complete Profile**: Ensure your student profile is complete with:
   - Skills and technical competencies
   - Areas of interest
   - Preferred specializations
   - Academic background
   - Career goals (optional but recommended)

2. **Authentication**: You must be logged in as a student to access recommendations.

### Accessing Recommendations

Navigate to the recommendations section in your dashboard or use the API endpoints directly.

## Understanding Recommendations

### Recommendation Components

Each recommendation includes:

1. **Project Information**
   - Title and description
   - Supervisor details
   - Specialization area
   - Difficulty level
   - Technology stack
   - Prerequisites

2. **Matching Details**
   - Similarity score (0-100%)
   - Matching skills
   - Matching interests
   - Alignment with specialization

3. **Explanation**
   - Why this project was recommended
   - How it matches your profile
   - Potential learning outcomes
   - Career relevance

### Similarity Scores

Similarity scores indicate how well a project matches your profile:

- **90-100%**: Excellent match - highly recommended
- **80-89%**: Very good match - strong alignment
- **70-79%**: Good match - worth considering
- **60-69%**: Moderate match - some alignment
- **50-59%**: Fair match - limited alignment
- **Below 50%**: Poor match - not recommended

### Recommendation Quality Indicators

Look for these quality indicators:

- 🎯 **High Similarity**: Score above 80%
- 🔧 **Skill Match**: Multiple matching technical skills
- 💡 **Interest Alignment**: Matches your stated interests
- 🎓 **Specialization Fit**: Aligns with your chosen specialization
- 🚀 **Career Relevant**: Supports your career goals

## Using the Recommendation System

### 1. Getting Basic Recommendations

**API Endpoint**: `GET /recommendations`

**Web Interface**: Navigate to "My Recommendations" in your dashboard

The system will automatically generate recommendations based on your current profile. Default settings provide 10 recommendations with diversity across specializations.

### 2. Customizing Recommendations

You can customize recommendations using these parameters:

#### Limit Results

\`\`\`
GET /recommendations?limit=5
\`\`\`

- **Range**: 1-20 recommendations
- **Default**: 10 recommendations
- **Tip**: Use fewer results for focused exploration, more for comprehensive options

#### Filter by Specialization

\`\`\`
GET /recommendations?includeSpecializations=AI,WebDev
GET /recommendations?excludeSpecializations=Hardware
\`\`\`

- **Include**: Only show specific specializations
- **Exclude**: Hide certain specializations
- **Available**: AI, WebDev, Mobile, DataScience, Cybersecurity, Hardware, etc.

#### Set Difficulty Level

\`\`\`
GET /recommendations?maxDifficulty=intermediate
\`\`\`

- **Levels**: beginner, intermediate, advanced, expert
- **Default**: No limit (all levels)
- **Tip**: Match your comfort level and available time

#### Minimum Quality Threshold

\`\`\`
GET /recommendations?minSimilarityScore=0.7
\`\`\`

- **Range**: 0.0-1.0 (0-100%)
- **Default**: 0.3 (30%)
- **Tip**: Higher thresholds give fewer but better matches

#### Diversity Control

\`\`\`
GET /recommendations?includeDiversityBoost=false
\`\`\`

- **Default**: true (includes diverse specializations)
- **False**: Focus on best matches only
- **Tip**: Enable for exploration, disable for focused search

### 3. Refreshing Recommendations

**API Endpoint**: `POST /recommendations/refresh`

**When to Refresh**:

- After updating your profile
- When exploring new interests
- If recommendations seem outdated
- To get fresh perspectives

**Note**: Refreshing bypasses the cache and may take longer but provides the most current recommendations.

### 4. Viewing Recommendation History

**API Endpoint**: `GET /recommendations/history`

**Use Cases**:

- Compare different recommendation sets
- Track how recommendations change over time
- Review previously considered projects
- Analyze recommendation patterns

### 5. Getting Detailed Explanations

**API Endpoint**: `GET /recommendations/{id}/explanation?projectId={projectId}`

**What You'll Learn**:

- Specific skill matches and gaps
- How the project aligns with your interests
- Learning opportunities and challenges
- Career development potential
- Supervisor expertise alignment

#### Accessible Explanations

**API Endpoint**: `GET /recommendations/{id}/accessible-explanation?projectId={projectId}`

**Features**:

- Plain language explanations
- Visual similarity indicators
- Hover-over definitions for technical terms
- Screen reader compatible
- Progressive disclosure of details

### 6. Providing Feedback

**API Endpoint**: `POST /recommendations/{id}/feedback`

**Feedback Types**:

#### Like/Dislike

\`\`\`json
{
  "projectId": "project-uuid",
  "feedbackType": "like",
  "comment": "Great match for my interests in AI and healthcare"
}
\`\`\`

#### Rating (1-5 stars)

\`\`\`json
{
  "projectId": "project-uuid",
  "feedbackType": "rating",
  "rating": 4.5,
  "comment": "Good project but technology stack is challenging"
}
\`\`\`

#### Bookmark

\`\`\`json
{
  "projectId": "project-uuid",
  "feedbackType": "bookmark"
}
\`\`\`

**Why Provide Feedback**:

- Improves future recommendations
- Helps other students
- Contributes to system learning
- Provides valuable data to supervisors

## Advanced Features

### 1. Progressive Loading

**API Endpoint**: `POST /recommendations/generate-with-progress`

**Benefits**:

- Real-time progress updates
- Estimated completion time
- Ability to cancel long-running requests
- Better user experience for complex queries

**Monitoring Progress**:

\`\`\`
GET /recommendations/progress/{requestId}
\`\`\`

**Response Includes**:

- Current processing stage
- Percentage complete
- Estimated time remaining
- Intermediate results (if available)

### 2. Batch Processing (Admin Only)

**API Endpoint**: `POST /recommendations/batch`

**Use Cases**:

- Generate recommendations for multiple students
- Bulk processing for new academic years
- Research and analytics
- System performance testing

## Understanding AI Explanations

### How the AI Works

The recommendation system uses several AI techniques:

1. **Semantic Similarity**: Analyzes the meaning of text in your profile and project descriptions
2. **Skill Matching**: Compares your technical skills with project requirements
3. **Interest Alignment**: Matches your stated interests with project themes
4. **Specialization Fit**: Considers your academic specialization preferences
5. **Diversity Boost**: Ensures recommendations span multiple areas to prevent tunnel vision

### Explanation Components

#### Skill Analysis

- **Matching Skills**: Skills you have that the project needs
- **Skill Gaps**: Skills the project requires that you could learn
- **Skill Overlap**: Percentage of required skills you already possess
- **Learning Opportunities**: New skills you would develop

#### Interest Alignment

- **Direct Matches**: Your interests that directly relate to the project
- **Related Areas**: Adjacent interests that connect to the project
- **Interest Score**: How well the project matches your interest profile
- **Exploration Potential**: New areas you might find interesting

#### Career Relevance

- **Industry Connections**: How the project relates to your career goals
- **Skill Development**: Professional skills you would gain
- **Portfolio Value**: How the project would enhance your portfolio
- **Market Demand**: Relevance to current job market trends

### Interpreting Confidence Levels

The system provides confidence indicators:

- **High Confidence** (🟢): Strong data support, reliable recommendation
- **Medium Confidence** (🟡): Good data support, likely good match
- **Low Confidence** (🟠): Limited data, recommendation with caution
- **Very Low Confidence** (🔴): Insufficient data, explore with care

## Troubleshooting

### Common Issues

#### 1. No Recommendations Generated

**Possible Causes**:

- Incomplete profile information
- Very restrictive filters
- No matching projects available
- System temporarily unavailable

**Solutions**:

- Complete your profile with skills and interests
- Relax filter criteria (lower minSimilarityScore, remove specialization filters)
- Contact support if the issue persists

#### 2. Poor Quality Recommendations

**Possible Causes**:

- Outdated profile information
- Vague or generic profile content
- Limited project database
- Algorithm needs more feedback

**Solutions**:

- Update your profile with specific, current information
- Provide detailed skills and interests
- Give feedback on recommendations to improve the system
- Try refreshing recommendations

#### 3. Recommendations Don't Match Interests

**Possible Causes**:

- Profile information doesn't reflect current interests
- System prioritizing skills over interests
- Diversity boost showing broader options
- Insufficient interest data in profile

**Solutions**:

- Update your interests in your profile
- Provide more detailed interest descriptions
- Disable diversity boost for more focused results
- Give feedback to train the system

#### 4. Slow Recommendation Generation

**Possible Causes**:

- High system load
- Complex profile requiring extensive processing
- AI service temporarily slow
- Network connectivity issues

**Solutions**:

- Use cached recommendations when available
- Try during off-peak hours
- Use progressive loading for real-time updates
- Contact support if consistently slow

### Error Messages

#### "Insufficient Profile Data"

- **Meaning**: Your profile lacks required information for recommendations
- **Action**: Add skills, interests, and specialization preferences to your profile

#### "Rate Limit Exceeded"

- **Meaning**: Too many requests in a short time period
- **Action**: Wait a few minutes before requesting new recommendations

#### "AI Service Unavailable"

- **Meaning**: The AI recommendation engine is temporarily down
- **Action**: The system will provide rule-based fallback recommendations

#### "No Projects Match Criteria"

- **Meaning**: Your filters are too restrictive
- **Action**: Broaden your search criteria or remove some filters

## Best Practices

### Profile Optimization

1. **Be Specific**: Use specific skill names and technologies
2. **Stay Current**: Update your profile as you learn new skills
3. **Include Interests**: Add both technical and domain interests
4. **Set Realistic Goals**: Match difficulty levels to your experience
5. **Regular Updates**: Review and update your profile monthly

### Using Recommendations Effectively

1. **Start Broad**: Begin with default settings to see the full range
2. **Gradually Filter**: Add filters to narrow down to your preferences
3. **Read Explanations**: Understand why projects were recommended
4. **Provide Feedback**: Help improve the system for everyone
5. **Explore Diversity**: Don't ignore lower-scored but interesting projects

### Feedback Guidelines

1. **Be Honest**: Provide genuine feedback about recommendation quality
2. **Be Specific**: Include details about why you liked or disliked a recommendation
3. **Consider Learning**: Factor in learning opportunities, not just current skills
4. **Think Long-term**: Consider career goals and growth potential
5. **Regular Feedback**: Provide feedback consistently to improve accuracy

## Privacy and Data Usage

### What Data is Used

- Your profile information (skills, interests, specializations)
- Your feedback on recommendations
- Your interaction patterns (views, bookmarks, etc.)
- Academic performance data (if available and consented)

### How Data is Protected

- All data is encrypted in transit and at rest
- Personal information is never shared with external parties
- Recommendation algorithms use anonymized data for learning
- You can request data deletion at any time

### Improving the System

Your usage helps improve recommendations for all students:

- Feedback trains the AI algorithms
- Usage patterns help optimize performance
- Profile diversity improves matching accuracy
- Error reports help fix system issues

## Getting Help

### Support Channels

1. **Documentation**: Check this guide and API documentation
2. **FAQ**: Review frequently asked questions
3. **Help Desk**: Contact student support for technical issues
4. **Feedback**: Use the feedback system to report problems
5. **Community**: Join student forums for peer support

### Reporting Issues

When reporting issues, include:

- Your student ID (for account-specific issues)
- Steps to reproduce the problem
- Error messages (if any)
- Browser/device information (for web interface issues)
- Screenshots (if helpful)

### Feature Requests

We welcome suggestions for improvements:

- Use the feedback system for minor suggestions
- Contact support for major feature requests
- Participate in user surveys and feedback sessions
- Join beta testing programs for new features

## Conclusion

The AI-Powered Recommendations system is designed to help you discover the perfect final year project. By maintaining an up-to-date profile and providing regular feedback, you'll receive increasingly accurate and helpful recommendations.

Remember that recommendations are suggestions to guide your exploration - the final choice should align with your personal goals, interests, and circumstances. Use the system as a starting point for discovering opportunities you might not have considered otherwise.

For the most current information and updates, always refer to the latest documentation and system announcements.
