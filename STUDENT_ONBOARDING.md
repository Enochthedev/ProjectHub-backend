# Student Onboarding System

## Overview

ProjectHub now includes an **automatic onboarding system** that provides new students with:
- ✅ A welcoming onboarding project with platform guidance
- ✅ Personalized project recommendations based on their interests and specializations
- ✅ Pre-created bookmark categories for organizing projects
- ✅ Automatic bookmarking of recommended projects

## How It Works

### When a Student Signs Up

1. **Registration** - Student creates an account with:
   - Name
   - Email (@ui.edu.ng domain required)
   - Password
   - Role (Student)
   - Skills (optional)
   - Interests (optional)
   - Preferred Specializations (optional)

2. **Profile Creation** - System creates:
   - User account
   - Student profile with their information
   - Default notification preferences

3. **Automatic Onboarding** (NEW!) - System automatically:
   - Creates 4 default bookmark categories:
     - ⭐ **Recommended for You** - Projects based on their interests
     - 📚 **Reading List** - Projects to review later
     - ❤️ **Favorites** - Favorite projects
     - 🎯 **Top Choices** - Projects to apply to

   - Bookmarks the **Getting Started** onboarding project

   - Finds and bookmarks 5 recommended projects matching:
     - Their preferred specializations
     - Beginner/Intermediate difficulty levels
     - Currently available (no student assigned)

### The Onboarding Project

The system includes a special onboarding project:

**Title**: 🎓 Getting Started with ProjectHub - Your First Project

**Purpose**:
- Teaches students how to use the platform
- Explains the AI Assistant features
- Guides through project discovery and application
- Provides research methodology guidance

**Key Features**:
- Always available to all students
- Tagged with "Onboarding", "Tutorial", "Getting Started"
- Includes comprehensive notes on using the AI Assistant
- Links to platform documentation

**AI Assistant Integration**:
Students can ask the AI Assistant questions like:
- "How do I write a research proposal?"
- "What specialization should I choose?"
- "How does the AI Assistant work?"
- "How do I apply to a project?"

## Implementation Details

### New Service: `StudentOnboardingService`

**Location**: `src/services/student-onboarding.service.ts`

**Methods**:
- `initializeStudentProjects(userId)` - Main method called on signup
- `createDefaultCategories(userId)` - Creates bookmark categories
- `bookmarkOnboardingProject(userId, categoryId)` - Bookmarks getting started project
- `bookmarkRecommendedProjects(userId, studentProfile, categoryId)` - Finds matching projects
- `getRecommendedProjects(userId)` - Get fresh recommendations anytime

**Logic for Recommendations**:
```typescript
1. Find approved projects with no assigned student
2. Match student's preferred specializations
3. Filter to Beginner/Intermediate difficulty
4. Select 5 random matching projects
5. If no matches, select 3 general beginner projects
6. Bookmark all in "Recommended for You" category
```

### Modified Files

1. **`src/seeds/seeder.service.ts`**
   - Added onboarding project to seed data
   - Project is seeded first in the list
   - Tagged appropriately for easy discovery

2. **`src/auth/auth.service.ts`**
   - Injected `StudentOnboardingService`
   - Calls `initializeStudentProjects()` after creating student profile
   - Runs asynchronously to avoid blocking registration

3. **`src/auth/auth.module.ts`**
   - Imported `ProjectModule` with `forwardRef`
   - Enables access to onboarding service

4. **`src/modules/project.module.ts`**
   - Added `StudentOnboardingService` to providers
   - Added required entities (ProjectBookmark, BookmarkCategory, StudentProfile)
   - Exported service for use in AuthModule

## Database Impact

### New Seed Data

Running `npm run seed` or `npm run seed:projects` will create:
- 1 onboarding project (Getting Started)
- 30+ research projects across all specializations
- 6 supervisors with different expertise
- 8 sample students (for testing)

### Automatic Data Creation

When a new student signs up, the system creates:
- 4 BookmarkCategory records
- 1+ ProjectBookmark records (onboarding project)
- Up to 5 additional ProjectBookmark records (recommendations)

## Testing the System

### 1. Seed the Database

```bash
# Make sure database is running
docker-compose up -d postgres redis qdrant

# Run all seeds (includes onboarding project)
npm run seed

# Or just seed projects
npm run seed:projects
```

### 2. Start the Backend

```bash
# Development mode
npm run dev

# Or with Docker
docker-compose up backend
```

### 3. Register a New Student

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newstudent@ui.edu.ng",
    "password": "SecurePass123!",
    "role": "student",
    "name": "Test Student",
    "skills": ["JavaScript", "Python"],
    "interests": ["Web Development", "AI"],
    "specializations": ["Web Development & Full Stack", "Artificial Intelligence & Machine Learning"]
  }'
```

### 4. Verify Onboarding

Check the logs for:
```
Created student profile for user: newstudent@ui.edu.ng
Initializing projects for new student: <user-id>
Created bookmark category: ⭐ Recommended for You for student <user-id>
Bookmarked onboarding project for student: <user-id>
Bookmarked recommended project: <project-title> for student <user-id>
Successfully initialized projects for student: <user-id>
```

### 5. Check Student's Bookmarks

```bash
# Get auth token from registration response
TOKEN="<jwt-token>"

# Get bookmarked projects
curl http://localhost:3000/api/bookmarks \
  -H "Authorization: Bearer $TOKEN"
```

**Expected Result**:
- 4 bookmark categories
- 6 bookmarked projects (1 onboarding + 5 recommendations)
- Projects match student's interests/specializations

## Benefits

### For Students
- **Immediate Value** - No empty dashboard on first login
- **Guided Experience** - Clear starting point with onboarding project
- **Personalized** - Recommendations match their interests
- **Organized** - Pre-created categories for project management
- **AI-Powered** - Can immediately use AI Assistant for guidance

### For the Platform
- **Better Engagement** - Students see content immediately
- **Reduced Confusion** - Clear onboarding path
- **Increased Usage** - Students more likely to explore
- **Data Collection** - Track which recommendations lead to applications

## Configuration

### Customizing Recommendations

Edit `src/services/student-onboarding.service.ts`:

```typescript
// Change number of recommended projects (default: 5)
.limit(5) // Line 183

// Change difficulty filter (default: Beginner + Intermediate)
levels: [DifficultyLevel.BEGINNER, DifficultyLevel.INTERMEDIATE]

// Change fallback project count (default: 3)
take: 3 // Line 203
```

### Customizing Bookmark Categories

Edit `createDefaultCategories()` method:

```typescript
const defaultCategories = [
  {
    name: '⭐ Recommended for You',
    description: 'Projects recommended based on your interests and skills',
    color: '#FFD700',
  },
  // Add more categories...
];
```

### Disabling Auto-Onboarding

If you want to disable automatic onboarding:

In `src/auth/auth.service.ts`, remove or comment out:

```typescript
// Initialize default projects and recommendations for new students
if (this.studentOnboardingService) {
  this.studentOnboardingService
    .initializeStudentProjects(user.id)
    .catch((error) => {
      // Error handling...
    });
}
```

## Troubleshooting

### Issue: No Projects Recommended

**Cause**: Database not seeded with projects

**Solution**:
```bash
npm run seed:projects
```

### Issue: Onboarding Project Not Found

**Cause**: Seed script hasn't run

**Check**:
```sql
SELECT * FROM projects WHERE title LIKE '%Getting Started%';
```

**Solution**:
```bash
npm run seed:projects
```

### Issue: Circular Dependency Error

**Cause**: Missing `forwardRef()` in module imports

**Check**:
- `src/auth/auth.module.ts` - Should have `forwardRef(() => ProjectModule)`
- Both services use `@Inject(forwardRef(() => Service))`

### Issue: Bookmarks Not Created

**Check Logs**:
- Look for "Failed to initialize projects for student" errors
- Verify student profile was created
- Check database constraints on bookmark tables

**Solution**:
```bash
# Check student profile exists
SELECT * FROM student_profiles WHERE user_id = '<user-id>';

# Check bookmark categories were created
SELECT * FROM bookmark_categories WHERE student_id = '<user-id>';
```

## Future Enhancements

Potential improvements to the onboarding system:

1. **Email Welcome Series**
   - Send getting started email
   - Tips for using AI Assistant
   - Project selection guidance

2. **Interactive Tutorial**
   - Step-by-step walkthrough
   - Highlight key features
   - Track completion

3. **Smart Recommendations**
   - Use AI to analyze student background
   - Match with supervisor expertise
   - Consider project success rates

4. **Progress Tracking**
   - Track onboarding completion
   - Nudge students who haven't engaged
   - Celebrate milestones

5. **Peer Matching**
   - Suggest students with similar interests
   - Facilitate group project formation
   - Build study groups

## API Endpoints

### Get Recommended Projects (Anytime)

```
GET /api/students/recommendations
Authorization: Bearer <token>
```

**Response**:
```json
{
  "recommendations": [
    {
      "id": "uuid",
      "title": "Project Title",
      "abstract": "Project description...",
      "specialization": "Web Development & Full Stack",
      "difficultyLevel": "intermediate",
      "supervisor": {
        "name": "Dr. John Doe",
        "specializations": ["Web Development"]
      }
    }
  ]
}
```

### Get Bookmark Categories

```
GET /api/bookmarks/categories
Authorization: Bearer <token>
```

**Response**:
```json
{
  "categories": [
    {
      "id": "uuid",
      "name": "⭐ Recommended for You",
      "description": "Projects recommended based on your interests",
      "color": "#FFD700",
      "projectCount": 6
    }
  ]
}
```

## Summary

The Student Onboarding System ensures that:
- ✅ New students never see an empty dashboard
- ✅ They have immediate guidance through the onboarding project
- ✅ They discover relevant projects matching their interests
- ✅ They can start using the AI Assistant right away
- ✅ They have an organized system for managing projects

This creates a welcoming, engaging first experience that encourages exploration and reduces time-to-value for new users.
