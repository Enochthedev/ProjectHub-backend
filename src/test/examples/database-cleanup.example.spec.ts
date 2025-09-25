import { TestDatabaseUtil, DatabaseCleanupUtil } from '../utils';
import { UserFixtures } from '../fixtures';
import { User } from '../../entities';

describe('Database Cleanup Examples', () => {
  beforeAll(async () => {
    await TestDatabaseUtil.beforeAll();
  });

  afterAll(async () => {
    await TestDatabaseUtil.afterAll();
  });

  beforeEach(async () => {
    await TestDatabaseUtil.beforeEach();
  });

  afterEach(async () => {
    await TestDatabaseUtil.afterEach();
  });

  it('should demonstrate clean all functionality', async () => {
    // Arrange - Create some test data
    const dataSource = TestDatabaseUtil.getDataSource();
    const userRepository = TestDatabaseUtil.getRepository(User);

    const userData = await UserFixtures.createMultipleStudents(5);
    const users = userRepository.create(userData);
    await userRepository.save(users);

    // Verify data exists
    let userCount = await userRepository.count();
    expect(userCount).toBe(5);

    // Act - Clean all data
    await DatabaseCleanupUtil.cleanAll(dataSource);

    // Assert - Verify data is cleaned
    userCount = await userRepository.count();
    expect(userCount).toBe(0);
  });

  it('should demonstrate test user cleanup', async () => {
    // Arrange - Create mix of test and non-test users
    const dataSource = TestDatabaseUtil.getDataSource();
    const userRepository = TestDatabaseUtil.getRepository(User);

    // Create test users
    const testUserData = await UserFixtures.createTestStudent({
      email: 'test.cleanup@ui.edu.ng',
    });
    const testUser = userRepository.create(testUserData);
    await userRepository.save(testUser);

    // Create regular user (won't be cleaned by test cleanup)
    const regularUserData = await UserFixtures.createTestStudent({
      email: 'regular.user@ui.edu.ng',
    });
    const regularUser = userRepository.create(regularUserData);
    await userRepository.save(regularUser);

    // Verify both users exist
    let userCount = await userRepository.count();
    expect(userCount).toBe(2);

    // Act - Clean only test users
    await DatabaseCleanupUtil.cleanTestUsers(dataSource);

    // Assert - Only test user should be removed
    userCount = await userRepository.count();
    expect(userCount).toBe(1);

    const remainingUser = await userRepository.findOne({
      where: { email: 'regular.user@ui.edu.ng' },
    });
    expect(remainingUser).toBeDefined();
  });

  it('should demonstrate email-based cleanup', async () => {
    // Arrange
    const dataSource = TestDatabaseUtil.getDataSource();
    const userRepository = TestDatabaseUtil.getRepository(User);

    const emails = ['user1@ui.edu.ng', 'user2@ui.edu.ng', 'user3@ui.edu.ng'];

    for (const email of emails) {
      const userData = await UserFixtures.createTestStudent({ email });
      const user = userRepository.create(userData);
      await userRepository.save(user);
    }

    // Verify all users exist
    let userCount = await userRepository.count();
    expect(userCount).toBe(3);

    // Act - Clean specific emails
    await DatabaseCleanupUtil.cleanUsersByEmails(dataSource, [
      'user1@ui.edu.ng',
      'user3@ui.edu.ng',
    ]);

    // Assert - Only user2 should remain
    userCount = await userRepository.count();
    expect(userCount).toBe(1);

    const remainingUser = await userRepository.findOne({
      where: { email: 'user2@ui.edu.ng' },
    });
    expect(remainingUser).toBeDefined();
  });

  it('should demonstrate database statistics', async () => {
    // Arrange
    const dataSource = TestDatabaseUtil.getDataSource();
    const userRepository = TestDatabaseUtil.getRepository(User);

    // Create some test data
    const studentData = await UserFixtures.createMultipleStudents(3);
    const supervisorData = await UserFixtures.createMultipleSupervisors(2);

    const students = userRepository.create(studentData);
    const supervisors = userRepository.create(supervisorData);

    await userRepository.save([...students, ...supervisors]);

    // Act - Get database statistics
    const stats = await DatabaseCleanupUtil.getDatabaseStats(dataSource);

    // Assert
    expect(stats.users).toBe(5);
    // Note: Profile counts depend on whether profiles are created with users
  });

  it('should demonstrate transaction-based testing', async () => {
    // This example shows how to use transactions for test isolation
    await TestDatabaseUtil.withTransaction(async (transactionalDataSource) => {
      const userRepository = transactionalDataSource.getRepository(User);

      // Create data within transaction
      const userData = await UserFixtures.createTestStudent();
      const user = userRepository.create(userData);
      await userRepository.save(user);

      // Verify data exists within transaction
      const userCount = await userRepository.count();
      expect(userCount).toBe(1);

      // Data will be rolled back automatically when transaction ends
    });

    // Verify data was rolled back
    const userRepository = TestDatabaseUtil.getRepository(User);
    const userCount = await userRepository.count();
    expect(userCount).toBe(0);
  });
});
